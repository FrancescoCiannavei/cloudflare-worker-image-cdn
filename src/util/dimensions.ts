/**
 * Util to extract image dimensions from binary headers
 * Reads PNG, JPEG, and WebP format headers without decoding the full image
 */

export function getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
	const bytes = new Uint8Array(buffer);

	// PNG: Check for PNG signature and read IHDR chunk
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		const width = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19];
		const height = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23];
		return { width, height };
	}

	// JPEG: Look for SOF (Start of Frame) marker
	if (bytes[0] === 0xff && bytes[1] === 0xd8) {
		let offset = 2;
		while (offset < bytes.length) {
			if (bytes[offset] !== 0xff) break;
			const marker = bytes[offset + 1];
			// SOF markers: 0xC0-0xCF (except 0xC4, 0xC8, 0xCC)
			if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
				const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
				const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
				return { width, height };
			}
			const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
			offset += segmentLength + 2;
		}
	}

	// WebP: Check RIFF header
	if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
		if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
			if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38) {
				if (bytes[15] === 0x20) {
					// VP8
					const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
					const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
					return { width, height };
				} else if (bytes[15] === 0x4c) {
					// VP8L
					const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
					const width = (bits & 0x3fff) + 1;
					const height = ((bits >> 14) & 0x3fff) + 1;
					return { width, height };
				}
			}
		}
	}

	return null;
}
