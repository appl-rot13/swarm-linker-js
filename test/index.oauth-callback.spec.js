import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, expectUrl } from "./test-utils.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /oauth/callback", () => {
	describe("when the code is valid", () => {
		it("returns an access token message", async () => {
			const { fetchMock, response } = await runFetchWorker();

			expect(response.status).toBe(200);
			expect(await response.text()).toBe('Save the access token "TEST_FOURSQUARE_ACCESS_TOKEN" in Secrets.');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expectUrl(
				fetchMock.mock.calls[0][0],
				"https://foursquare.com",
				"/oauth2/access_token",
				{
					client_id: "TEST_FOURSQUARE_API_KEY",
					client_secret: "TEST_FOURSQUARE_API_SECRET",
					grant_type: "authorization_code",
					redirect_uri: "http://example.com/oauth/callback",
					code: "CODE",
				},
			);
		});
	});

	describe("when the access token is not returned", () => {
		it("returns 502", async () => {
			const { fetchMock, response } = await runFetchWorker({ accessToken: null });

			expect(response.status).toBe(502);
			expect(await response.text()).toBe("Bad Gateway");

			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	describe("when the code is missing", () => {
		it("returns 403", async () => {
			const { fetchMock, response } = await runFetchWorker({ code: null });

			expect(response.status).toBe(403);
			expect(await response.text()).toBe("Forbidden");

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});

async function runFetchWorker({ code = "CODE", accessToken = "TEST_FOURSQUARE_ACCESS_TOKEN" } = {}) {
	const env = createEnv();
	const ctx = createExecutionContext();
	const request = new Request(`http://example.com/oauth/callback${code ? `?code=${code}` : ""}`);

	const fetchMock = vi.spyOn(global, "fetch")
		.mockResolvedValue(createJsonResponse(accessToken ? { access_token: accessToken } : {}));

	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return { fetchMock, response };
}
