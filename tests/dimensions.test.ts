import { getImageDimensions } from "../src/util/dimensions";

function makePng(width: number, height: number): ArrayBuffer {
	const b = new Uint8Array(24);
	// PNG signature
	b[0] = 0x89; b[1] = 0x50; b[2] = 0x4e; b[3] = 0x47;
	b[4] = 0x0d; b[5] = 0x0a; b[6] = 0x1a; b[7] = 0x0a;
	// IHDR chunk header at offset 8 (length + "IHDR"), width@16, height@20
	b[16] = (width >> 24) & 0xff;
	b[17] = (width >> 16) & 0xff;
	b[18] = (width >> 8) & 0xff;
	b[19] = width & 0xff;
	b[20] = (height >> 24) & 0xff;
	b[21] = (height >> 16) & 0xff;
	b[22] = (height >> 8) & 0xff;
	b[23] = height & 0xff;
	return b.buffer;
}

function makeJpeg(width: number, height: number): ArrayBuffer {
	// SOI + a single SOF0 segment containing height/width
	const b = new Uint8Array(20);
	b[0] = 0xff; b[1] = 0xd8; // SOI
	b[2] = 0xff; b[3] = 0xc0; // SOF0
	b[4] = 0x00; b[5] = 0x11; // segment length (17)
	b[6] = 0x08; // precision
	b[7] = (height >> 8) & 0xff;
	b[8] = height & 0xff;
	b[9] = (width >> 8) & 0xff;
	b[10] = width & 0xff;
	return b.buffer;
}

function makeWebpVp8(width: number, height: number): ArrayBuffer {
	const b = new Uint8Array(32);
	// "RIFF"
	b[0] = 0x52; b[1] = 0x49; b[2] = 0x46; b[3] = 0x46;
	// file size (ignored by parser)
	// "WEBP"
	b[8] = 0x57; b[9] = 0x45; b[10] = 0x42; b[11] = 0x50;
	// "VP8 "
	b[12] = 0x56; b[13] = 0x50; b[14] = 0x38; b[15] = 0x20;
	// width @ 26, height @ 28 (little-endian, 14 bits each)
	b[26] = width & 0xff;
	b[27] = (width >> 8) & 0x3f;
	b[28] = height & 0xff;
	b[29] = (height >> 8) & 0x3f;
	return b.buffer;
}

describe("getImageDimensions", () => {
	it("parses PNG dimensions", () => {
		expect(getImageDimensions(makePng(1920, 1080))).toEqual({ width: 1920, height: 1080 });
	});

	it("parses JPEG dimensions from SOF0", () => {
		expect(getImageDimensions(makeJpeg(800, 600))).toEqual({ width: 800, height: 600 });
	});

	it("parses WebP VP8 dimensions", () => {
		expect(getImageDimensions(makeWebpVp8(640, 480))).toEqual({ width: 640, height: 480 });
	});

	it("returns null for unknown formats", () => {
		const buf = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]).buffer;
		expect(getImageDimensions(buf)).toBeNull();
	});

	it("returns null for empty buffers", () => {
		expect(getImageDimensions(new ArrayBuffer(0))).toBeNull();
	});
});
