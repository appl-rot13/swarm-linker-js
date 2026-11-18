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

			if (env.ENDPOINT_ACCESS_TOKEN) {
				switch (url.pathname) {
					case `/${env.ENDPOINT_ACCESS_TOKEN}/tweet`:
						return await tweetCheckin(env);

					case `/${env.ENDPOINT_ACCESS_TOKEN}/tweet/latest`:
						return await tweetLatestCheckin(env);
				}
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

	const accessToken = await foursquare.fetchAccessToken(env, code);
	if (!accessToken) {
		return new Response("Bad Gateway", { status: 502 });
	}

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
		// The webhook may be triggered not only by check-ins.
		return new Response("OK");
	}

	const checkin = JSON.parse(checkinText);
	ctx.waitUntil(shareCheckin(env, checkin.id).catch(err => {
		console.error("Unhandled error:", err);
	}));

	return new Response("OK");
}

async function shareCheckin(env, checkinId) {
	if (!await foursquare.refreshCachedCheckinById(env, checkinId)) {
		return;
	}

	if (isAutoTweetEnabled(env)) {
		const { text, url } = await foursquare.createShareContents(env);
		if (!text) {
			return;
		}

		console.log(await twitter.tweet(env, text + url));
	}

	// Add posting to social media platforms here as needed.
}

async function tweetCheckin(env) {
	const { text, url } = await foursquare.createShareContents(env);
	if (!text) {
		return new Response(null, { status: 204 });
	}

	return Response.redirect(twitter.getIntentUrl(text, url), 302);
}

async function tweetLatestCheckin(env) {
	if (!await foursquare.refreshCachedCheckin(env)) {
		return new Response(null, { status: 204 });
	}

	return await tweetCheckin(env);
}

function isAutoTweetEnabled(env) {
	return (
		env.AUTO_TWEET_ENABLED === "true" &&
		Boolean(env.TWITTER_API_KEY) &&
		Boolean(env.TWITTER_API_KEY_SECRET) &&
		Boolean(env.TWITTER_ACCESS_TOKEN) &&
		Boolean(env.TWITTER_ACCESS_TOKEN_SECRET)
	);
}
