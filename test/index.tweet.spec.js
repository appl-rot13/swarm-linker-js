import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, afterEach, vi } from "vitest";
import worker from "../src/index.js";
import { createEnv, createJsonResponse, createCheckinDetails, expectUrl } from "./test-utils.js";

afterEach(() => vi.restoreAllMocks());

describe("GET /tweet", () => {
	describe("when a check-in is available", () => {
		it("redirects to Twitter", async () => {
			const cachedCheckin = createCheckinDetails();
			const { env, response } = await runFetchWorker({ cachedCheckin });

			expect(response.status).toBe(302);
			expect(response.headers.get("Location")).toBe(
				"intent://x.com/intent/tweet" +
				"?text=I'm%20at%20%3CVenue%20Name%3E%20in%20%3CCity%3E%2C%20%3CState%3E%0A%3CURL%3E" +
				"#Intent;scheme=https;package=com.twitter.android;end");

			expect(env.KV.put).not.toHaveBeenCalled();
		});
	});

	describe("when a check-in is not available", () => {
		it("returns 204", async () => {
			const { env, response } = await runFetchWorker();

			expect(response.status).toBe(204);
			expect(response.body).toBeNull();

			expect(env.KV.put).not.toHaveBeenCalled();
		});
	});

	describe("when ENDPOINT_ACCESS_TOKEN is undefined", () => {
		it("returns 404", async () => {
			const { env, response } = await runFetchWorker({
				envOverrides: {
					ENDPOINT_ACCESS_TOKEN: "",
				},
			});

			expect(response.status).toBe(404);
			expect(await response.text()).toBe("Not Found");

			expect(env.KV.put).not.toHaveBeenCalled();
		});
	});
});

async function runFetchWorker({ cachedCheckin, envOverrides = {} } = {}) {
	const env = Object.assign(createEnv(cachedCheckin), envOverrides);
	const ctx = createExecutionContext();
	const request = new Request("http://example.com/TEST_ENDPOINT_ACCESS_TOKEN/tweet");

	const response = await worker.fetch(request, env, ctx);
	await waitOnExecutionContext(ctx);

	return { env, response };
}
