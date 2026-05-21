import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, expectUrl } from "./test-utils.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /oauth", () => {
	it("redirects to the Foursquare OAuth endpoint", async () => {
		const env = createEnv();
		const ctx = createExecutionContext();
		const request = new Request("http://example.com/oauth");

		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(302);
		expectUrl(
			response.headers.get("Location"),
			"https://foursquare.com",
			"/oauth2/authenticate",
			{
				client_id: "TEST_API_KEY",
				response_type: "code",
				redirect_uri: "http://example.com/oauth/callback",
			},
		);
	});
});
