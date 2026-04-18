import {
	MAX_AVIF_PIXELS,
	MAX_ENCODE_PIXELS,
	canEncode,
	canEncodeAvif,
	getBestFormat,
	getContentType,
} from "../src/util/convert";

describe("canEncodeAvif", () => {
	it("accepts images at the pixel ceiling", () => {
		expect(canEncodeAvif(MAX_AVIF_PIXELS, 1)).toBe(true);
	});

	it("rejects images over the ceiling", () => {
		expect(canEncodeAvif(MAX_AVIF_PIXELS + 1, 1)).toBe(false);
	});

	it("accepts small images", () => {
		expect(canEncodeAvif(100, 100)).toBe(true);
	});
});

describe("canEncode", () => {
	it("accepts images at the encode ceiling", () => {
		expect(canEncode(MAX_ENCODE_PIXELS, 1)).toBe(true);
	});

	it("rejects images over the encode ceiling", () => {
		expect(canEncode(MAX_ENCODE_PIXELS + 1, 1)).toBe(false);
	});

	it("accepts 4K (3840x2160)", () => {
		// 8.29 MP — must fit, otherwise the whole point of the WebP ceiling is moot.
		expect(canEncode(3840, 2160)).toBe(true);
	});

	it("has a wider ceiling than AVIF", () => {
		expect(MAX_ENCODE_PIXELS).toBeGreaterThan(MAX_AVIF_PIXELS);
	});
});

describe("getBestFormat", () => {
	it("prefers avif when accepted and no dimensions", () => {
		expect(getBestFormat("image/avif,image/webp,*/*")).toBe("avif");
	});

	it("prefers avif when accepted and dimensions fit", () => {
		expect(getBestFormat("image/avif", { width: 1000, height: 1000 })).toBe("avif");
	});

	it("falls back to webp when avif accepted but dimensions exceed AVIF ceiling", () => {
		expect(getBestFormat("image/avif,image/webp", { width: 4000, height: 4000 })).toBe("webp");
	});

	it("returns webp when only webp is accepted", () => {
		expect(getBestFormat("image/webp,*/*")).toBe("webp");
	});

	it("returns null when neither avif nor webp is accepted", () => {
		expect(getBestFormat("image/png,image/jpeg")).toBeNull();
	});

	it("returns null for empty accept header", () => {
		expect(getBestFormat("")).toBeNull();
	});

	it("returns null when avif-only accept but dimensions too large", () => {
		// Only avif accepted, but image too large — no webp fallback possible
		expect(getBestFormat("image/avif", { width: 4000, height: 4000 })).toBeNull();
	});
});

describe("getContentType", () => {
	it("returns correct MIME for avif", () => {
		expect(getContentType("avif")).toBe("image/avif");
	});

	it("returns correct MIME for webp", () => {
		expect(getContentType("webp")).toBe("image/webp");
	});
});
