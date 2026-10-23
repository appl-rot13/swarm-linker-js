import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, createCheckinDetails, expectUrl } from "./test-utils.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /tweet/latest", () => {
	describe("when the latest check-in is available", () => {
		it.each([
			{
				case: "no check-in is cached",
			},
			{
				case: "the cached check-in is not the latest",
				cachedCheckin: createCheckinDetails((checkin) => (checkin.id = "different_id")),
			},
		])("updates the cache and redirects to Twitter when $case", async ({ cachedCheckin }) => {
			const { env, fetchMock, response } = await runFetchWorker({ cachedCheckin });

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(
				"intent://x.com/intent/tweet" +
				"?text=I'm%20at%20%3CVenue%20Name%3E%20in%20%3CCity%3E%2C%20%3CState%3E%0A%3CURL%3E" +
				"#Intent;scheme=https;package=com.twitter.android;end");

			const expectedCheckin = createCheckinDetails();
			expect(await env.KV.get("LatestCheckin", "json")).toEqual(expectedCheckin);

			expect(env.KV.put).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledTimes(2);

			const [userCheckinsUrl] = fetchMock.mock.calls[0];
			expectUrl(userCheckinsUrl, "https://api.foursquare.com", "/v2/users/self/checkins");

			const [checkinUrl] = fetchMock.mock.calls[1];
			expectUrl(checkinUrl, "https://api.foursquare.com", "/v2/checkins/checkin_id");
		});

		it("redirects to Twitter without updating the cache when the latest check-in is already cached", async () => {
			const cachedCheckin = createCheckinDetails();
			const { env, fetchMock, response } = await runFetchWorker({ cachedCheckin });

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(
				"intent://x.com/intent/tweet" +
				"?text=I'm%20at%20%3CVenue%20Name%3E%20in%20%3CCity%3E%2C%20%3CState%3E%0A%3CURL%3E" +
				"#Intent;scheme=https;package=com.twitter.android;end");

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledTimes(1);

			const [userCheckinsUrl] = fetchMock.mock.calls[0];
			expectUrl(userCheckinsUrl, "https://api.foursquare.com", "/v2/users/self/checkins");
		});
	});

	describe("when the latest check-in is not available", () => {
		it("returns 204 when user check-ins cannot be fetched", async () => {
			const { env, fetchMock, response } = await runFetchWorker({ userCheckinsResponse: {} });

			expect(response.status).toBe(204);
			expect(response.body).toBeNull();

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it("returns 204 when check-in details cannot be fetched", async () => {
			const { env, fetchMock, response } = await runFetchWorker({ checkinDetailsResponse: {} });

			expect(response.status).toBe(204);
			expect(response.body).toBeNull();

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
	});

	describe("when ENDPOINT_ACCESS_TOKEN is undefined", () => {
		it("returns 404", async () => {
			const { env, fetchMock, response } = await runFetchWorker({
				envOverrides: {
					ENDPOINT_ACCESS_TOKEN: "",
				},
			});

			expect(response.status).toBe(404);
			expect(await response.text()).toBe("Not Found");

			expect(env.KV.put).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});

async function runFetchWorker({ cachedCheckin, envOverrides = {}, userCheckinsResponse, checkinDetailsResponse } = {}) {
	const env = Object.assign(createEnv(cachedCheckin), envOverrides);
	const ctx = createExecutionContext();
	const request = new Request("http://example.com/TEST_ENDPOINT_ACCESS_TOKEN/tweet/latest");

	const fetchMock = vi.spyOn(global, "fetch")
		.mockResolvedValueOnce(createUserCheckinsResponse(userCheckinsResponse))
		.mockResolvedValueOnce(createCheckinDetailsResponse(checkinDetailsResponse));

	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return { env, fetchMock, response };
}

function createCheckinDetailsResponse(response) {
	return createJsonResponse(response ?? {
		response: {
			checkin: createCheckinDetails(),
		},
	});
}

function createUserCheckinsResponse(response) {
	return createJsonResponse(response ?? {
		response: {
			checkins: {
				items: [{ id: "checkin_id" }],
			},
		},
	});
}
