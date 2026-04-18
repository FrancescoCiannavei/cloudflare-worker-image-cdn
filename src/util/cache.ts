/**
 * Util to cache transformed images in R2
 *
 * Cache keys are built from a canonical (format, path, quality, w, h) tuple —
 * NOT from the raw request query string. This avoids fragmenting the cache on
 * query param order (`?w=100&h=200` vs `?h=200&w=100`) or on unrelated params
 * the client may tack on (tracking params, cache-busters, etc.).
 */
import { ImageFormat, getContentType } from "./convert";

export interface CacheParams {
	quality: number;
	width?: number;
	height?: number;
}

export function buildCacheKey(pathname: string, format: ImageFormat, params: CacheParams): string {
	let key = `${format}${pathname}?quality=${params.quality}`;
	if (params.width !== undefined) key += `&w=${params.width}`;
	if (params.height !== undefined) key += `&h=${params.height}`;
	return key;
}

export async function getCachedImage(
	bucket: R2Bucket,
	pathname: string,
	format: ImageFormat,
	params: CacheParams,
): Promise<{ data: ReadableStream; contentType: string } | null> {
	return null; // TODO: remove this line, we're disabling cache for testing
	const key = buildCacheKey(pathname, format, params);
	const object = await bucket.get(key);

	if (!object) return null;

	const contentType = object.httpMetadata?.contentType ?? getContentType(format);
	return { data: object.body, contentType };
}

export async function putCachedImage(
	bucket: R2Bucket,
	pathname: string,
	format: ImageFormat,
	params: CacheParams,
	data: Uint8Array,
): Promise<void> {
	const key = buildCacheKey(pathname, format, params);
	await bucket.put(key, data, {
		httpMetadata: {
			contentType: getContentType(format),
			cacheControl: "public, max-age=86400",
		},
	});
}
