import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, createCheckinDetails, expectUrl } from "./test-utils.js";

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("POST /webhook", () => {
	describe("when a check-in is available", () => {
		it("updates the cache and tweets", async () => {
			const { env, fetchMock, response } = await runFetchWorker();

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			const expectedCheckin = createCheckinDetails();
			expect(await env.KV.get("LatestCheckin", "json")).toEqual(expectedCheckin);

			expect(env.KV.put).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledTimes(2);

			const [checkinUrl] = fetchMock.mock.calls[0];
			expectUrl(checkinUrl, "https://api.foursquare.com", "/v2/checkins/checkin_id");

			const [tweetUrl, tweetRequest] = fetchMock.mock.calls[1];
			expectUrl(tweetUrl, "https://api.x.com", "/2/tweets");

			expect(tweetRequest.method).toBe("POST");
			expect(tweetRequest.headers.Authorization).toContain("OAuth");
			expect(JSON.parse(tweetRequest.body)).toEqual({
				text: "I'm at <Venue Name> in <City>, <State>\n<URL>",
			});
		});

		it("updates the cache without tweeting when AUTO_TWEET_ENABLED is undefined", async () => {
			const { env, fetchMock, response } = await runFetchWorker({
				envOverrides: {
					AUTO_TWEET_ENABLED: "",
				},
			});

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			const expectedCheckin = createCheckinDetails();
			expect(await env.KV.get("LatestCheckin", "json")).toEqual(expectedCheckin);

			expect(env.KV.put).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledTimes(1);

			const [checkinUrl] = fetchMock.mock.calls[0];
			expectUrl(checkinUrl, "https://api.foursquare.com", "/v2/checkins/checkin_id");
		});

		it.each([
			"TWITTER_API_KEY",
			"TWITTER_API_KEY_SECRET",
			"TWITTER_ACCESS_TOKEN",
			"TWITTER_ACCESS_TOKEN_SECRET",
		])("updates the cache without tweeting when %s is missing", async (key) => {
			const { env, fetchMock, response } = await runFetchWorker({
				envOverrides: {
					[key]: "",
				},
			});

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(env.KV.put).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	describe("when a check-in is not available", () => {
		it("does not update the cache when check-in details cannot be fetched", async () => {
			const { env, fetchMock, response } = await runFetchWorker({ checkinDetailsResponse: {} });

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	describe("when a push is not a check-in", () => {
		it("ignores the push", async () => {
			const { env, fetchMock, response } = await runFetchWorker({
				pushParams: {
					secret: "TEST_FOURSQUARE_PUSH_SECRET",
				},
			});

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe("when the push secret is invalid", () => {
		it.each([
			{
				case: "incorrect",
				pushParams: { secret: "INCORRECT_FOURSQUARE_PUSH_SECRET" },
			},
			{
				case: "missing",
				pushParams: {},
			},
		])("returns 403 when the push secret is $case", async ({ pushParams }) => {
			const { env, fetchMock, response } = await runFetchWorker({ pushParams });

			expect(response.status).toBe(403);
			expect(await response.text()).toBe("Forbidden");

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});

async function runFetchWorker({ envOverrides = {}, pushParams, checkinDetailsResponse } = {}) {
	const env = Object.assign(createEnv(), envOverrides);
	const ctx = createExecutionContext();
	const request = createPostRequest("http://example.com/webhook", pushParams ?? {
		secret: "TEST_FOURSQUARE_PUSH_SECRET",
		checkin: JSON.stringify({ id: "checkin_id" }),
	});

	const fetchMock = vi.spyOn(global, "fetch")
		.mockResolvedValueOnce(createCheckinDetailsResponse(checkinDetailsResponse))
		.mockResolvedValueOnce(createJsonResponse({ data: { id: "", text: "" } }));

	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return { env, fetchMock, response };
}

function createPostRequest(url, params = {}) {
	return new Request(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams(params),
	});
}

function createCheckinDetailsResponse(response) {
	return createJsonResponse(response ?? {
		response: {
			checkin: createCheckinDetails(),
		},
	});
}
