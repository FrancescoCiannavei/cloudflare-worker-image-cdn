/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.ts"],
	moduleNameMapper: {
		"^wasm-image-optimization/workerd$": "<rootDir>/tests/stubs/wasm-image-optimization.ts",
	},
	transform: {
		"^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
	},
};
