/**
 * Util to proxy requests to the origin server
 */
import { getBestFormat, getContentType, convertImage } from "./convert";

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

	const imageData = await originResponse.arrayBuffer();
	const converted = await convertImage(imageData, format);

	return new Response(converted, {
		status: 200,
		headers: {
			"Content-Type": getContentType(format),
			"Cache-Control": "public, max-age=86400",
		},
	});
}
