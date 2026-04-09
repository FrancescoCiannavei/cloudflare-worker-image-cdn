/**
 * Util to cache transformed images in R2
 * Uses the request URL (path + query) as the cache key
 */
import { ImageFormat, getContentType } from "./convert";

export function buildCacheKey(url: URL, format: ImageFormat): string {
	// return example: avif/john-cena.jpg?quality=10&w=600&h=100
	return `${format}${url.pathname}${url.search}`;
}

export async function getCachedImage(
	bucket: R2Bucket,
	url: URL,
	format: ImageFormat,
): Promise<{ data: ReadableStream; contentType: string } | null> {
	const key = buildCacheKey(url, format);
	const object = await bucket.get(key);

	if (!object) return null;

	const contentType = object.httpMetadata?.contentType ?? getContentType(format);
	return { data: object.body, contentType };
}

export async function putCachedImage(
	bucket: R2Bucket,
	url: URL,
	format: ImageFormat,
	data: Uint8Array,
): Promise<void> {
	const key = buildCacheKey(url, format);
	await bucket.put(key, data, {
		httpMetadata: {
			contentType: getContentType(format),
			cacheControl: "public, max-age=86400",
		},
	});
}
