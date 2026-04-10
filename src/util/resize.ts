/**
 * Util to resize the image
 * Takes width/height params and resizes while preserving aspect ratio
 * Never upscales - only makes images smaller
 */
import { optimizeImage } from "wasm-image-optimization/workerd";

export async function resizeImage(
	imageData: ArrayBuffer,
	targetWidth?: number,
	targetHeight?: number,
): Promise<Uint8Array> {
	const image = new Uint8Array(imageData);

	// Get original dimensions via probe
	const probe = await optimizeImage({ image });

	const origW = probe.originalWidth;
	const origH = probe.originalHeight;

	const { width, height } = computeDimensions(origW, origH, targetWidth, targetHeight);

	if (width === origW && height === origH) {
		return probe.data;
	}

	const result = await optimizeImage({
		image,
		width,
		height,
		fit: "contain",
	});

	return result.data;
}

export function computeDimensions(
	origW: number,
	origH: number,
	targetWidth?: number,
	targetHeight?: number,
): { width: number; height: number } {
	if (!targetWidth && !targetHeight) {
		return { width: origW, height: origH };
	}

	const aspect = origW / origH;

	if (targetWidth && targetHeight) {
		// Pick the dimension that results in the larger output (contain behavior)
		const wFromWidth = targetWidth;
		const hFromWidth = targetWidth / aspect;

		const hFromHeight = targetHeight;
		const wFromHeight = targetHeight * aspect;

		let w: number;
		let h: number;

		if (wFromWidth * hFromWidth >= wFromHeight * hFromHeight) {
			w = wFromWidth;
			h = hFromWidth;
		} else {
			w = wFromHeight;
			h = hFromHeight;
		}

		// Checks if the resulting image is larger than the original image
		// We don't upscale
		if (w > origW || h > origH) {
			w = origW;
			h = origH;
		}

		return { width: Math.round(w), height: Math.round(h) };
	}

	if (targetWidth) {
		const w = Math.min(targetWidth, origW);
		const h = Math.round(w / aspect);
		return { width: w, height: h };
	} else {
		const h = Math.min(targetHeight!, origH);
		const w = Math.round(h * aspect);
		return { width: w, height: h };
	}
}
