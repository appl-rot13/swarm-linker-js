import { createHmac } from "node:crypto";
import OAuth from "oauth-1.0a";

export async function tweet(env, text) {
	const oauth = new OAuth({
		consumer: {
			key: env.TWITTER_API_KEY,
			secret: env.TWITTER_API_KEY_SECRET,
		},
		signature_method: "HMAC-SHA1",
		hash_function(base_string, key) {
			return createHmac("sha1", key).update(base_string).digest("base64");
		},
	});

	const oauthToken = {
		key: env.TWITTER_ACCESS_TOKEN,
		secret: env.TWITTER_ACCESS_TOKEN_SECRET,
	};

	return await apiRequest(oauth, oauthToken, "tweets", { text: text });
}

async function apiRequest(oauth, oauthToken, endpoint, body) {
	const request = {
		url: `https://api.x.com/2/${endpoint}`,
		method: "POST",
	};

	const response = await fetch(request.url, {
		method: request.method,
		headers: {
			...oauth.toHeader(oauth.authorize(request, oauthToken)),
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	return response.json();
}
