/**
 * Util to proxy requests to the origin server
 */
import { getBestFormat, getContentType, convertImage } from "./convert";
import { resizeImage } from "./resize";

function passthrough(response: Response): Response {
	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}

export async function proxyRequest(
	request: Request,
	originBaseUrl: string,
): Promise<Response> {
	const url = new URL(request.url);
	const originUrl = `${originBaseUrl}${url.pathname}${url.search}`;

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

	const accept = request.headers.get("accept") || "";
	const format = getBestFormat(accept);

	if (!format) {
		return passthrough(originResponse);
	}

	const width = url.searchParams.get("w") ? Number(url.searchParams.get("w")) : undefined;
	const height = url.searchParams.get("h") ? Number(url.searchParams.get("h")) : undefined;
	const quality = url.searchParams.get("quality") ? Math.min(100, Math.max(1, Number(url.searchParams.get("quality")))) : undefined;

	let imageData = await originResponse.arrayBuffer();

	if (width || height) {
		imageData = (await resizeImage(imageData, width, height)).buffer as ArrayBuffer;
	}

	const converted = await convertImage(imageData, format, quality);

	return new Response(converted, {
		status: 200,
		headers: {
			"Content-Type": getContentType(format),
			"Cache-Control": "public, max-age=86400",
		},
	});
}
