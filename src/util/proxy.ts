/**
 * Util to proxy requests to the origin server
 */
import { getBestFormat, getContentType, convertImage } from "./convert";
import { resizeImage } from "./resize";
import { getCachedImage, putCachedImage } from "./cache";

// Max image size to process (bytes). Images larger than this are passed through
// to avoid exceeding the 128MB Worker memory limit during WASM processing.
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB

function passthrough(response: Response): Response {
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}

function buildResponseHeaders(contentType: string, cacheStatus: "HIT" | "MISS"): HeadersInit {
	return {
		"Content-Type": contentType,
		"Cache-Control": "public, max-age=86400",
		"X-Cache": cacheStatus,
	};
}

export async function proxyRequest(
	request: Request,
	originBaseUrl: string,
	bucket: R2Bucket,
	ctx: ExecutionContext,
): Promise<Response> {
	const url = new URL(request.url);
	const originUrl = `${originBaseUrl}${url.pathname}${url.search}`;

	const accept = request.headers.get("accept") || "";
	const format = getBestFormat(accept);

	const width = url.searchParams.get("w") ? Number(url.searchParams.get("w")) : undefined;
	const height = url.searchParams.get("h") ? Number(url.searchParams.get("h")) : undefined;
	const quality = url.searchParams.get("quality")
		? Math.min(100, Math.max(1, Number(url.searchParams.get("quality"))))
		: 100;

	// Check CF edge cache (fastest, no Worker processing)
	const cacheKey = new Request(url.toString(), { method: "GET" });
	const edgeCache = caches.default;
	const edgeCached = await edgeCache.match(cacheKey);
	if (edgeCached) {
		return edgeCached;
	}

	// Check R2 cache before fetching from origin
	if (format) {
		const cached = await getCachedImage(bucket, url, format);
		if (cached) {
			const response = new Response(cached.data, {
				status: 200,
				headers: buildResponseHeaders(cached.contentType, "HIT"),
			});
			// Clone into edge cache for subsequent requests
			ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
			return response;
		}
	}

	// Cache miss — fetch from origin
	const originHost = new URL(originUrl).host;
	const originResponse = await fetch(originUrl, {
		method: request.method,
		headers: {
			...Object.fromEntries(request.headers),
			Host: originHost,
		},
	});

	if (!originResponse.ok) {
		return passthrough(originResponse);
	}

	const contentType = originResponse.headers.get("content-type") || "";
	if (!contentType.startsWith("image/") || contentType.includes("svg")) {
		return passthrough(originResponse);
	}

	if (!format) {
		return passthrough(originResponse);
	}

	// Reject oversized images before buffering into memory
	const contentLength = Number(originResponse.headers.get("content-length") || "0");
	if (contentLength > MAX_IMAGE_SIZE) {
		return passthrough(originResponse);
	}

	// Buffer image with streaming size guard (Content-Length may be missing/wrong)
	let imageData: ArrayBuffer | null = await readWithSizeLimit(originResponse, MAX_IMAGE_SIZE);
	if (!imageData) {
		// Image exceeded size limit during streaming — can't return the
		// original since we already consumed part of the body.
		return new Response("Image too large to process", { status: 413 });
	}

	// Process image, nulling references between steps to help GC
	if (width || height) {
		const resized = await resizeImage(imageData, width, height);
		imageData = null; // release original buffer
		const converted = await convertImage(resized.buffer as ArrayBuffer, format, quality);

		await putCachedImage(bucket, url, format, converted);
		const response = new Response(converted, {
			status: 200,
			headers: buildResponseHeaders(getContentType(format), "MISS"),
		});
		ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
		return response;
	}

	const converted = await convertImage(imageData, format, quality);
	imageData = null; // release original buffer

	// Store in R2 cache and edge cache
	await putCachedImage(bucket, url, format, converted);

	const response = new Response(converted, {
		status: 200,
		headers: buildResponseHeaders(getContentType(format), "MISS"),
	});
	ctx.waitUntil(edgeCache.put(cacheKey, response.clone()));
	return response;
}

/**
 * Reads a Response body up to maxBytes. Returns null if the body exceeds the limit.
 */
async function readWithSizeLimit(response: Response, maxBytes: number): Promise<ArrayBuffer | null> {
	// Fast path: if Content-Length is present and within limit, use arrayBuffer() directly
	const contentLength = Number(response.headers.get("content-length") || "0");
	if (contentLength > 0 && contentLength <= maxBytes) {
		return response.arrayBuffer();
	}

	// Streaming path: accumulate chunks with size checking
	const reader = response.body!.getReader();
	const chunks: Uint8Array[] = [];
	let totalSize = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			totalSize += value.byteLength;
			if (totalSize > maxBytes) {
				reader.cancel();
				return null;
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	// Combine chunks into single ArrayBuffer
	const combined = new Uint8Array(totalSize);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return combined.buffer as ArrayBuffer;
}
