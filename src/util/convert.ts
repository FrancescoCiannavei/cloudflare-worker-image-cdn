/**
 * Util to convert the image to the best supported format
 */

export type ImageFormat = "avif" | "webp";

// Ceiling for AVIF encoding on a 128MB Worker, derived from the libaom memory
// model. Peak ≈ pixel_count × AVIF_BYTES_PER_PIXEL + encoder baseline, on top
// of the rest of the runtime. Downscales route through a separate photon WASM
// instance whose linear memory doesn't shrink after free, so its high-water
// reservation sticks around for the lifetime of the isolate.
const WORKER_MEMORY_LIMIT_MB = 128;
const JS_RUNTIME_OVERHEAD_MB = 30;
const PHOTON_WASM_OVERHEAD_MB = 35;
const AVIF_ENCODER_BASELINE_MB = 20;
const ENCODER_HEADROOM_MB = 5;
const AVIF_BYTES_PER_PIXEL = 13;

const avifEncoderWorkspaceBytes = (
	WORKER_MEMORY_LIMIT_MB
	- JS_RUNTIME_OVERHEAD_MB
	- PHOTON_WASM_OVERHEAD_MB
	- AVIF_ENCODER_BASELINE_MB
	- ENCODER_HEADROOM_MB
) * 1_000_000;

export const MAX_AVIF_PIXELS = Math.floor(avifEncoderWorkspaceBytes / AVIF_BYTES_PER_PIXEL);

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
