import { expect, vi } from "vitest";

export function createEnv(cachedCheckin) {
	const map = new Map();
	if (cachedCheckin) {
		map.set("LatestCheckin", JSON.stringify(cachedCheckin));
	}

	return {
		KV: {
			get: vi.fn(async (key, type) => {
				const value = map.get(key);
				if (value == null) {
					return null;
				}

				return type === "json" ? JSON.parse(value) : value;
			}),

			put: vi.fn(async (key, value) => map.set(key, value)),
		},

		ENDPOINT_ACCESS_TOKEN: "TEST_ENDPOINT_ACCESS_TOKEN",
		AUTO_TWEET_ENABLED: "true",

		FOURSQUARE_API_VERSION: "20240601",
		FOURSQUARE_API_KEY: "TEST_FOURSQUARE_API_KEY",
		FOURSQUARE_API_KEY_SECRET: "TEST_FOURSQUARE_API_SECRET",
		FOURSQUARE_PUSH_SECRET: "TEST_FOURSQUARE_PUSH_SECRET",
		FOURSQUARE_REDIRECT_URI: "http://example.com/oauth/callback",
		FOURSQUARE_ACCESS_TOKEN: "TEST_FOURSQUARE_ACCESS_TOKEN",

		TWITTER_API_KEY: "TEST_TWITTER_API_KEY",
		TWITTER_API_KEY_SECRET: "TEST_TWITTER_API_KEY_SECRET",
		TWITTER_ACCESS_TOKEN: "TEST_TWITTER_ACCESS_TOKEN",
		TWITTER_ACCESS_TOKEN_SECRET: "TEST_TWITTER_ACCESS_TOKEN_SECRET",
	};
}

export function createJsonResponse(value, options = {}) {
	return new Response(JSON.stringify(value), {
		headers: { "Content-Type": "application/json" },
		...options,
	});
}

export function createCheckinDetails(modifier) {
	const checkin = {
		id: "checkin_id",
		venue: {
			name: "<Venue Name>",
			location: {
				city: "<City>",
				state: "<State>",
				formattedAddress: ["", "<Address>", "123-4567"],
			},
		},
		checkinShortUrl: "<URL>",
	};

	if (modifier) {
		modifier(checkin);
	}

	return checkin;
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
