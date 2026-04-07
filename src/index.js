import * as foursquare from "./foursquare.js";
import * as twitter from "./twitter.js";

export default {
	async fetch(request, env, ctx) {
		try {
			const url = new URL(request.url);
			switch (url.pathname) {
				case "/oauth":
					return initiateAuthorization(env);

				case "/oauth/callback":
					return await handleAuthorizationCallback(url, env);

				case "/webhook":
					return await handleWebhook(request, env, ctx);
			}

			return new Response("Not Found", { status: 404 });
		} catch (err) {
			console.error("Unhandled error:", err);
			return new Response("Internal Server Error", { status: 500 });
		}
	},
};

function initiateAuthorization(env) {
	return foursquare.initiateAuthorization(env);
}

async function handleAuthorizationCallback(url, env) {
	const code = url.searchParams.get("code");
	if (!code) {
		return new Response("Forbidden", { status: 403 });
	}

	const accessToken = await foursquare.getAccessToken(env, code);
	return new Response(`Save the access token "${accessToken}" in Secrets.`);
}

async function handleWebhook(request, env, ctx) {
	const formData = await request.formData();
	console.log(Object.fromEntries(formData));

	const secret = formData.get("secret");
	if (secret !== env.FOURSQUARE_PUSH_SECRET) {
		return new Response("Forbidden", { status: 403 });
	}

	const checkinText = formData.get("checkin");
	if (!checkinText) {
		return new Response("OK");
	}

	const checkin = JSON.parse(checkinText);
	ctx.waitUntil(tweetCheckin(env, checkin.id).catch(err => {
		console.error("Unhandled error:", err);
	}));

	return new Response("OK");
}

async function tweetCheckin(env, checkinId) {
	const tweetText = await foursquare.createTweetText(env, checkinId);
	if (!tweetText) {
		return;
	}

	console.log(await twitter.tweet(env, tweetText));
}
