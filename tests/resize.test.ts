import { computeDimensions } from "../src/util/resize";

describe("computeDimensions", () => {
	it("returns original dimensions when no target is given", () => {
		expect(computeDimensions(1000, 500)).toEqual({ width: 1000, height: 500 });
	});

	it("scales by width only, preserving aspect ratio", () => {
		expect(computeDimensions(1000, 500, 400)).toEqual({ width: 400, height: 200 });
	});

	it("scales by height only, preserving aspect ratio", () => {
		expect(computeDimensions(1000, 500, undefined, 100)).toEqual({ width: 200, height: 100 });
	});

	it("never upscales when only width is given", () => {
		expect(computeDimensions(1000, 500, 5000)).toEqual({ width: 1000, height: 500 });
	});

	it("never upscales when only height is given", () => {
		expect(computeDimensions(1000, 500, undefined, 5000)).toEqual({ width: 1000, height: 500 });
	});

	it("picks the larger fit when both width and height are given (contain)", () => {
		// 1000x500 source, target 400x400
		// width-based: 400x200 (80k px), height-based: 800x400 (320k px)
		// 800x400 has larger area, so it wins
		expect(computeDimensions(1000, 500, 400, 400)).toEqual({ width: 800, height: 400 });
	});

	it("clamps to original when both-dimension target would upscale", () => {
		expect(computeDimensions(100, 50, 1000, 1000)).toEqual({ width: 100, height: 50 });
	});

	it("rounds fractional results", () => {
		// 1000x333, target width 500 -> height 500/(1000/333) = 166.5 -> 167
		const result = computeDimensions(1000, 333, 500);
		expect(result.width).toBe(500);
		expect(result.height).toBe(167);
	});

	it("handles square sources", () => {
		expect(computeDimensions(800, 800, 400)).toEqual({ width: 400, height: 400 });
	});
});
