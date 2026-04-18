/**
 * Util to downscale images with a high-quality Lanczos3 filter.
 *
 * wasm-image-optimization's Skia-based resize produces visibly aliased
 * output (stair-stepped diagonals, grainy fine detail) because its internal
 * sampling filter isn't exposed. We delegate the resize to photon so we can
 * pick Lanczos3, then hand the resized raster (as PNG) back to the caller
 * for encoding.
 */
import { PhotonImage, resize, SamplingFilter } from "@cf-wasm/photon";

export function downscale(
	imageBytes: Uint8Array,
	width: number,
	height: number,
): Uint8Array {
	const img = PhotonImage.new_from_byteslice(imageBytes);
	try {
		const resized = resize(img, width, height, SamplingFilter.Lanczos3);
		try {
			return resized.get_bytes();
		} finally {
			resized.free();
		}
	} finally {
		img.free();
	}
}
