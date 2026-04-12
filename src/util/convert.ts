/**
 * Util to convert the image to the best supported format
 */
import { optimizeImage } from "wasm-image-optimization/workerd";

export type ImageFormat = "avif" | "webp";

// Empirically-derived ceiling for AVIF encoding on a 128MB Worker.
// aom peak ≈ pixel_count × ~13 bytes + ~20MB baseline; 5MP leaves headroom
// for fragmentation and encoder variance.
export const MAX_AVIF_PIXELS = 5_000_000;

export function canEncodeAvif(width: number, height: number): boolean {
	return width * height <= MAX_AVIF_PIXELS;
}

export function getBestFormat(
	acceptHeader: string,
	dimensions?: { width: number; height: number },
): ImageFormat | null {
	if (
		acceptHeader.includes("image/avif")
		&& (!dimensions || canEncodeAvif(dimensions.width, dimensions.height))
	) return "avif";
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
