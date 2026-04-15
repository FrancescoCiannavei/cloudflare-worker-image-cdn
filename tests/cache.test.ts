import { buildCacheKey } from "../src/util/cache";

describe("buildCacheKey", () => {
	it("prefixes the path with the format", () => {
		const url = new URL("https://cdn.example.com/john-cena.jpg");
		expect(buildCacheKey(url, "avif")).toBe("avif/john-cena.jpg");
	});

	it("preserves query string as part of the key", () => {
		const url = new URL("https://cdn.example.com/john-cena.jpg?quality=10&w=600&h=100");
		expect(buildCacheKey(url, "avif")).toBe("avif/john-cena.jpg?quality=10&w=600&h=100");
	});

	it("produces distinct keys for different formats on the same path", () => {
		const url = new URL("https://cdn.example.com/img.png?w=400");
		expect(buildCacheKey(url, "avif")).not.toBe(buildCacheKey(url, "webp"));
	});

	it("produces distinct keys for different query params", () => {
		const a = buildCacheKey(new URL("https://x/img.jpg?w=400"), "webp");
		const b = buildCacheKey(new URL("https://x/img.jpg?w=800"), "webp");
		expect(a).not.toBe(b);
	});

	it("handles nested paths", () => {
		const url = new URL("https://cdn.example.com/a/b/c/img.jpg");
		expect(buildCacheKey(url, "webp")).toBe("webp/a/b/c/img.jpg");
	});
});
