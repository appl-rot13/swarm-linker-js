import * as utils from "./utils.js";

export function initiateAuthorization(env) {
	return Response.redirect(
		`https://foursquare.com/oauth2/authenticate` +
		`?client_id=${env.FOURSQUARE_API_KEY}` +
		`&response_type=code` +
		`&redirect_uri=${env.FOURSQUARE_REDIRECT_URI}`,
		302);
}

export async function fetchAccessToken(env, code) {
	const response = await fetch(
		`https://foursquare.com/oauth2/access_token` +
		`?client_id=${env.FOURSQUARE_API_KEY}` +
		`&client_secret=${env.FOURSQUARE_API_KEY_SECRET}` +
		`&grant_type=authorization_code` +
		`&redirect_uri=${env.FOURSQUARE_REDIRECT_URI}` +
		`&code=${code}`);

	const data = await response.json();
	return data?.access_token ?? null;
}

export async function fetchCheckinDetails(env, checkinId) {
	const response = await fetch(
		`https://api.foursquare.com/v2/checkins/${checkinId}` +
		`?v=${env.FOURSQUARE_API_VERSION}` +
		`&oauth_token=${env.FOURSQUARE_ACCESS_TOKEN}`);

	const data = await response.json();
	return data?.response?.checkin ?? null;
}

export async function fetchUserCheckins(env, limit, offset) {
	const response = await fetch(
		`https://api.foursquare.com/v2/users/self/checkins` +
		`?v=${env.FOURSQUARE_API_VERSION}` +
		`&limit=${limit}` +
		`&offset=${offset}` +
		`&oauth_token=${env.FOURSQUARE_ACCESS_TOKEN}`);

	const data = await response.json();
	return data?.response?.checkins?.items ?? [];
}

async function getCachedCheckin(env) {
	return await env.KV.get("LatestCheckin", "json");
}

async function setCachedCheckin(env, checkin) {
	await env.KV.put("LatestCheckin", JSON.stringify(checkin));
}

async function fetchLatestCheckinId(env) {
	const checkins = await fetchUserCheckins(env, 1, 0);
	return checkins?.[0]?.id;
}

export async function refreshCachedCheckin(env) {
	const latestCheckinId = await fetchLatestCheckinId(env);
	if (!latestCheckinId) {
		return false;
	}

	const cachedCheckin = await getCachedCheckin(env);
	if (cachedCheckin?.id === latestCheckinId) {
		return true;
	}

	return await refreshCachedCheckinById(env, latestCheckinId);
}

export async function refreshCachedCheckinById(env, checkinId) {
	const checkin = await fetchCheckinDetails(env, checkinId);
	if (!checkin) {
		return false;
	}

	await setCachedCheckin(env, checkin);
	return true;
}

function getVenueAddress(formattedAddress) {
	const venueAddress = formattedAddress.at(-1);
	if (utils.isPostalCode(venueAddress)) {
		return formattedAddress.at(-2);
	}

	return venueAddress;
}

function getVenueLocationText(location) {
	const { city, state, formattedAddress } = location;

	if (city && state) {
		return ` in ${city}, ${state}`;
	}

	if (formattedAddress?.length) {
		const venueAddress = getVenueAddress(formattedAddress);
		return ` in ${venueAddress}`;
	}

	if (state) {
		return ` in ${state}`;
	}

	// This case may not be necessary...
	if (city) {
		return ` in ${city}`;
	}

	return "";
}

export async function createShareContents(env) {
	const checkin = await getCachedCheckin(env);
	if (!checkin) {
		return {};
	}

	const venue = checkin.venue;
	const venueName = venue.name;
	const venueLocation = getVenueLocationText(venue.location);
	const shareUrl = checkin.checkinShortUrl;

	return {
		text: `I'm at ${venueName}${venueLocation}\n`,
		url: shareUrl,
	};
}
