import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, expectUrl } from "./test-utils.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /oauth/callback", () => {
	describe("when the code is valid", () => {
		it("returns an access token message", async () => {
			const env = createEnv();
			const ctx = createExecutionContext();
			const request = new Request("http://example.com/oauth/callback?code=CODE");

			const fetchMock = vi.spyOn(global, "fetch")
				.mockResolvedValue(createJsonResponse({ access_token: "TEST_ACCESS_TOKEN" }));

			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(await response.text()).toBe('Save the access token "TEST_ACCESS_TOKEN" in Secrets.');

			expect(fetchMock).toHaveBeenCalledTimes(1);
			expectUrl(
				fetchMock.mock.calls[0][0],
				"https://foursquare.com",
				"/oauth2/access_token",
				{
					client_id: "TEST_API_KEY",
					client_secret: "TEST_API_SECRET",
					grant_type: "authorization_code",
					redirect_uri: "http://example.com/oauth/callback",
					code: "CODE",
				},
			);
		});
	});

	describe("when the code is missing", () => {
		it("returns 403", async () => {
			const env = createEnv();
			const ctx = createExecutionContext();
			const request = new Request("http://example.com/oauth/callback");

			const fetchMock = vi.spyOn(global, "fetch");

			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(403);
			expect(await response.text()).toBe("Forbidden");

			expect(fetchMock).not.toHaveBeenCalled();
		});
	});
});
