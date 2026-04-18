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

// Upper bound on source image size that photon can decode without blowing the
// worker's 128MB heap. Photon's WASM linear memory doesn't shrink after .free(),
// so the decoded raster high-water (width × height × 4 bytes for RGBA) stays
// reserved for the isolate's lifetime. 3MP ≈ 12MB of raster, leaving room for
// the resize target, PNG re-encode, and WIO's separate WASM instance.
export const PHOTON_MAX_SOURCE_PIXELS = 3_000_000;

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
