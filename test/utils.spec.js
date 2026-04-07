import { describe, it, expect } from "vitest";
import * as utils from "../src/utils.js";

describe("isZipCode", () => {
	describe("valid cases", () => {
		it("returns true for standard zip codes", () => {
			expect(utils.isZipCode("123-4567")).toBe(true);
		});
	});
});
