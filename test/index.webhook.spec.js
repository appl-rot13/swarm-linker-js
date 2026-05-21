import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, expectUrl } from "./test-utils.js";

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("POST /webhook", () => {
	describe("when a check-in should be posted", () => {
		it.each([
			{
				case: "contains a postal code",
			},
			{
				case: "does not contain a postal code",
				modifier: (response) => {
					response.checkin.venue.location.formattedAddress.pop();
				},
			},
		])("formats the posted text when the formatted address $case", async ({ modifier }) => {
			const { fetchMock, response } = await runFetchWorker({ modifier });

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(fetchMock).toHaveBeenCalledTimes(2);

			const [checkinUrl] = fetchMock.mock.calls[0];
			expectUrl(checkinUrl, "https://api.foursquare.com", "/v2/checkins/checkin_id");

			const [tweetUrl, tweetRequest] = fetchMock.mock.calls[1];
			expectUrl(tweetUrl, "https://api.x.com", "/2/tweets");

			expect(tweetRequest.method).toBe("POST");
			expect(tweetRequest.headers.Authorization).toContain("OAuth");
			expect(JSON.parse(tweetRequest.body)).toEqual({
				text: "I'm at <Venue Name> in <Address>\n<URL>",
			});
		});
	});

	describe("when posting should be skipped", () => {
		it.each([
			{
				case: "twitter sharing is disabled",
				modifier: (response) => {
					response.checkin.shares.twitter = false;
				},
			},
			{
				case: "twitter sharing is missing",
				modifier: (response) => {
					delete response.checkin.shares.twitter;
				},
			},
			{
				case: "sharing is missing",
				modifier: (response) => {
					delete response.checkin.shares;
				},
			},
			{
				case: "check-in details cannot be fetched",
				modifier: (response) => {
					delete response.checkin;
				},
			},
		])("skips posting when $case", async ({ modifier }) => {
			const { fetchMock, response } = await runFetchWorker({ modifier });

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(fetchMock).toHaveBeenCalledTimes(1);

			const [checkinUrl] = fetchMock.mock.calls[0];
			expectUrl(checkinUrl, "https://api.foursquare.com", "/v2/checkins/checkin_id");
		});
	});

	describe("when the push is not a check-in", () => {
		it("ignores the push", async () => {
			const { fetchMock, response } = await runFetchWorker({
				params: {
					secret: "TEST_PUSH_SECRET",
				},
			});

			expect(response.status).toBe(200);
			expect(await response.text()).toBe("OK");

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe("when the push secret is invalid", () => {
		it.each([
			{
				case: "incorrect",
				params: { secret: "INCORRECT_PUSH_SECRET" },
			},
			{
				case: "missing",
				params: {},
			},
		])("returns 403 when the push secret is $case", async ({ params }) => {
			const { fetchMock, response } = await runFetchWorker({ params });

			expect(response.status).toBe(403);
			expect(await response.text()).toBe("Forbidden");

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});

async function runFetchWorker({ modifier, params } = {}) {
	const env = createEnv();
	const ctx = createExecutionContext();
	const request = createPostRequest("http://example.com/webhook", params ?? {
		secret: "TEST_PUSH_SECRET",
		checkin: JSON.stringify({ id: "checkin_id" }),
	});

	const fetchMock = vi.spyOn(global, "fetch")
		.mockResolvedValueOnce(createCheckinDetailsResponse(modifier))
		.mockResolvedValueOnce(createJsonResponse({ data: { id: "", text: "" } }));

	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return { fetchMock, response };
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

function createCheckinDetailsResponse(modifier) {
	const response = {
		checkin: {
			shares: { twitter: true },
			venue: {
				name: "<Venue Name>",
				location: {
					formattedAddress: ["", "<Address>", "123-4567"],
				},
			},
			checkinShortUrl: "<URL>",
		},
	};

	if (modifier) {
		modifier(response);
	}

	return createJsonResponse({ response });
}
