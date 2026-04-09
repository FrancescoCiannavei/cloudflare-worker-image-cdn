/**
 * Util to proxy requests to the origin server
 */
import { getBestFormat, getContentType, convertImage } from "./convert";
import { resizeImage } from "./resize";
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
	const originResponse = await fetch(originUrl, {
		method: request.method,
		headers: request.headers,
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

	let imageData = await originResponse.arrayBuffer();

	if (width || height) {
		imageData = (await resizeImage(imageData, width, height)).buffer as ArrayBuffer;
	}

	const converted = await convertImage(imageData, format, quality);

	// Store in R2 cache
	await putCachedImage(bucket, url, format, converted);

	return new Response(converted, {
		status: 200,
		headers: {
			"Content-Type": getContentType(format),
			"Cache-Control": "public, max-age=86400",
			"X-Cache": "MISS",
		},
	});
}
