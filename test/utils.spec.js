import { describe, it, expect } from "vitest";
import { isPostalCode } from "../src/utils.js";

describe("isPostalCode", () => {
	it.each([
		{ str: "123-4567", expected: true },
		{ str: "1234567", expected: false },
		{ str: "", expected: false },
	])("returns $expected when the string is $str", ({ str, expected }) => {
		expect(isPostalCode(str)).toBe(expected);
	});
});
