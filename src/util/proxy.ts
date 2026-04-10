/**
 * Util to proxy requests to the origin server
 */
import { optimizeImage } from "wasm-image-optimization/workerd";
import { getBestFormat, getContentType } from "./convert";
import { computeDimensions } from "./resize";
import { getImageDimensions } from "./dimensions";
import { getCachedImage, putCachedImage } from "./cache";

function passthrough(response: Response): Response {
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
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

	// Check R2 cache before fetching from origin
	if (format) {
		const cached = await getCachedImage(bucket, url, format);
		if (cached) {
			return new Response(cached.data, {
				status: 200,
				headers: {
					"Content-Type": cached.contentType,
					"Cache-Control": "public, max-age=86400",
					"X-Cache": "HIT",
				},
			});
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

	// Get image data as ArrayBuffer
	const imageData = await originResponse.arrayBuffer();

	// Build single optimizeImage call with all options (resize + format convert)
	const options: Record<string, unknown> = {
		image: imageData,
		format,
		quality,
	};

	// Add resize dimensions if requested (only downscale, never upscale)
	if (width || height) {
		const originalDimensions = getImageDimensions(imageData);
		if (originalDimensions) {
			const { width: targetW, height: targetH } = computeDimensions(
				originalDimensions.width,
				originalDimensions.height,
				width,
				height,
			);
			if (targetW < originalDimensions.width || targetH < originalDimensions.height) {
				options.width = targetW;
				options.height = targetH;
			}
		}
	}

	// Single WASM call: resize + format conversion in one pass
	const result = await optimizeImage(options as Parameters<typeof optimizeImage>[0]);
	const converted = result.data;

	// Store in R2 cache (non-blocking)
	ctx.waitUntil(putCachedImage(bucket, url, format, converted));

	return new Response(converted, {
		status: 200,
		headers: {
			"Content-Type": getContentType(format),
			"Cache-Control": "public, max-age=86400",
			"X-Cache": "MISS",
		},
	});
}
