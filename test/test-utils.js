import { expect } from "vitest";

export function createEnv() {
	return {
		FOURSQUARE_API_VERSION: "20240601",
		FOURSQUARE_API_KEY: "TEST_API_KEY",
		FOURSQUARE_API_KEY_SECRET: "TEST_API_SECRET",
		FOURSQUARE_PUSH_SECRET: "TEST_PUSH_SECRET",
		FOURSQUARE_REDIRECT_URI: "http://example.com/oauth/callback",
		FOURSQUARE_ACCESS_TOKEN: "TEST_ACCESS_TOKEN",

		TWITTER_API_KEY: "",
		TWITTER_API_KEY_SECRET: "",
		TWITTER_ACCESS_TOKEN: "",
		TWITTER_ACCESS_TOKEN_SECRET: "",
	};
}

export function createJsonResponse(value, options = {}) {
	return new Response(JSON.stringify(value), {
		headers: { "Content-Type": "application/json" },
		...options,
	});
}

export function expectUrl(resource, origin, pathname, params = {}) {
	expect(resource).not.toBeNull();

	const url = new URL(resource);
	expect(url.origin).toBe(origin);
	expect(url.pathname).toBe(pathname);

	for (const [key, value] of Object.entries(params)) {
		expect(url.searchParams.get(key)).toBe(value);
	}
}
