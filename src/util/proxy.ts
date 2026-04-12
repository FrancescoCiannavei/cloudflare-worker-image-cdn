/**
 * Util to proxy requests to the origin server
 */
import { optimizeImage, type OptimizeParams } from "wasm-image-optimization/workerd";
import { getBestFormat, getContentType, type ImageFormat } from "./convert";
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
	let format = getBestFormat(accept);

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

	// Probe source dimensions and resolve the target (post-resize) dimensions.
	// The encoder works on the resized raster, so AVIF feasibility is determined
	// by the target size — not the source.
	const dims = getImageDimensions(imageData);
	let targetW: number | undefined;
	let targetH: number | undefined;
	if (dims) {
		if (width || height) {
			const resized = computeDimensions(dims.width, dims.height, width, height);
			targetW = resized.width;
			targetH = resized.height;
		} else {
			targetW = dims.width;
			targetH = dims.height;
		}
		format = getBestFormat(accept, { width: targetW, height: targetH });
	}
	if (!format) {
		return passthrough(new Response(imageData, {
			headers: { "Content-Type": contentType },
		}));
	}

	// Build optimizeImage options
	const options: OptimizeParams = {
		image: imageData,
		format,
		quality,
		speed: 10,
	};

	// Apply resize if it would actually downscale (never upscale)
	if (dims && targetW !== undefined && targetH !== undefined) {
		if (targetW < dims.width || targetH < dims.height) {
			options.width = targetW;
			options.height = targetH;
		}
	}

	// Try requested format, fall back to WebP if AVIF blows memory
	let converted: Uint8Array;
	let outputFormat: ImageFormat = format;
	try {
		converted = (await optimizeImage(options)).data;
	} catch {
		if (format === "avif") {
			outputFormat = "webp";
			options.format = "webp";
			options.speed = 10;
			converted = (await optimizeImage(options)).data;
		} else {
			return passthrough(new Response(imageData, {
				headers: { "Content-Type": contentType },
			}));
		}
	}

	// Store in R2 cache (non-blocking)
	ctx.waitUntil(putCachedImage(bucket, url, outputFormat, converted));

	return new Response(converted, {
		status: 200,
		headers: {
			"Content-Type": getContentType(outputFormat),
			"Cache-Control": "public, max-age=86400",
			"X-Cache": "MISS",
		},
	});
}
