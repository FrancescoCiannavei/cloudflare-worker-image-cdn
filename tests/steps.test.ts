import { parseSteps, snapToStep } from "../src/util/steps";

describe("parseSteps", () => {
	it("returns [] for undefined", () => {
		expect(parseSteps(undefined)).toEqual([]);
	});

	it("returns [] for empty string", () => {
		expect(parseSteps("")).toEqual([]);
	});

	it("returns [] for invalid JSON", () => {
		expect(parseSteps("not-json")).toEqual([]);
	});

	it("returns [] for non-array JSON", () => {
		expect(parseSteps('{"a":1}')).toEqual([]);
	});

	it("returns [] for empty array", () => {
		expect(parseSteps("[]")).toEqual([]);
	});

	it("parses a numeric array and sorts ascending", () => {
		expect(parseSteps("[800, 100, 400]")).toEqual([100, 400, 800]);
	});

	it("coerces stringy numbers", () => {
		expect(parseSteps('["100","200"]')).toEqual([100, 200]);
	});

	it("filters out NaN and non-positive values", () => {
		expect(parseSteps('[100, -5, 0, "abc", 200]')).toEqual([100, 200]);
	});
});

describe("snapToStep", () => {
	it("returns value unchanged when steps are empty", () => {
		expect(snapToStep(57, [])).toBe(57);
	});

	it("snaps up to the smallest step >= value", () => {
		expect(snapToStep(150, [100, 400, 800])).toBe(400);
	});

	it("returns the step exactly when value matches", () => {
		expect(snapToStep(400, [100, 400, 800])).toBe(400);
	});

	it("returns the smallest step when value is below all", () => {
		expect(snapToStep(10, [100, 400, 800])).toBe(100);
	});

	it("clamps to the largest step when value exceeds all", () => {
		expect(snapToStep(9999, [100, 400, 800])).toBe(800);
	});

	it("works with a single step", () => {
		expect(snapToStep(5, [100])).toBe(100);
		expect(snapToStep(500, [100])).toBe(100);
	});
});
