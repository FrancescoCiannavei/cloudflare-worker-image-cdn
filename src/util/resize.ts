/**
 * Util to compute target dimensions while preserving aspect ratio.
 * Never upscales — only makes images smaller.
 */

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
