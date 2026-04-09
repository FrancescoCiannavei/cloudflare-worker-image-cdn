/**
 * Util to convert the image to the best supported format
 */
import { optimizeImage } from "wasm-image-optimization/workerd";

export type ImageFormat = "avif" | "webp";

export function getBestFormat(acceptHeader: string): ImageFormat | null {
	if (acceptHeader.includes("image/avif")) return "avif";
	if (acceptHeader.includes("image/webp")) return "webp";
	return null;
}

const CONTENT_TYPES: Record<ImageFormat, string> = {
	avif: "image/avif",
	webp: "image/webp",
};

export function getContentType(format: ImageFormat): string {
	return CONTENT_TYPES[format];
}

export async function convertImage(
	imageData: ArrayBuffer,
	format: ImageFormat,
	quality = 100,
): Promise<Uint8Array> {
	const result = await optimizeImage({
		image: new Uint8Array(imageData),
		format,
		quality,
	});
	return result.data;
}
