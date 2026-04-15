import { buildCacheKey } from "../src/util/cache";

describe("buildCacheKey", () => {
	it("prefixes the path with the format and always includes quality", () => {
		expect(buildCacheKey("/john-cena.jpg", "avif", { quality: 100 })).toBe(
			"avif/john-cena.jpg?quality=100",
		);
	});

	it("includes width and height when provided", () => {
		expect(
			buildCacheKey("/john-cena.jpg", "avif", { quality: 80, width: 600, height: 100 }),
		).toBe("avif/john-cena.jpg?quality=80&w=600&h=100");
	});

	it("produces distinct keys for different formats on the same path", () => {
		const params = { quality: 80, width: 400 };
		expect(buildCacheKey("/img.png", "avif", params)).not.toBe(
			buildCacheKey("/img.png", "webp", params),
		);
	});

	it("produces distinct keys for different widths", () => {
		const a = buildCacheKey("/img.jpg", "webp", { quality: 80, width: 400 });
		const b = buildCacheKey("/img.jpg", "webp", { quality: 80, width: 800 });
		expect(a).not.toBe(b);
	});

	it("ignores irrelevant query params (key is derived from canonical params only)", () => {
		// Both URLs would have produced different raw-search keys under the
		// old implementation; now they collapse to the same canonical key.
		const params = { quality: 80, width: 400 };
		expect(buildCacheKey("/img.jpg", "webp", params)).toBe("webp/img.jpg?quality=80&w=400");
	});

	it("is stable regardless of the order callers would have passed params in a URL", () => {
		// Canonical ordering: quality, then w, then h — no caller control.
		const a = buildCacheKey("/img.jpg", "webp", { quality: 80, width: 400, height: 200 });
		const b = buildCacheKey("/img.jpg", "webp", { height: 200, width: 400, quality: 80 });
		expect(a).toBe(b);
	});

	it("handles nested paths", () => {
		expect(buildCacheKey("/a/b/c/img.jpg", "webp", { quality: 100 })).toBe(
			"webp/a/b/c/img.jpg?quality=100",
		);
	});

	it("omits width/height when not provided", () => {
		expect(buildCacheKey("/img.jpg", "webp", { quality: 100 })).toBe("webp/img.jpg?quality=100");
	});
});
