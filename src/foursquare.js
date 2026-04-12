import * as utils from "./utils.js";

export function initiateAuthorization(env) {
	return Response.redirect(
		`https://foursquare.com/oauth2/authenticate` +
		`?client_id=${env.FOURSQUARE_API_KEY}` +
		`&response_type=code` +
		`&redirect_uri=${env.FOURSQUARE_REDIRECT_URI}`,
		302);
}

export async function getAccessToken(env, code) {
	const response = await fetch(
		`https://foursquare.com/oauth2/access_token` +
		`?client_id=${env.FOURSQUARE_API_KEY}` +
		`&client_secret=${env.FOURSQUARE_API_KEY_SECRET}` +
		`&grant_type=authorization_code` +
		`&redirect_uri=${env.FOURSQUARE_REDIRECT_URI}` +
		`&code=${code}`);

	const data = await response.json();
	return data.access_token;
}

export async function getCheckinDetails(env, checkinId) {
	const response = await fetch(
		`https://api.foursquare.com/v2/checkins/${checkinId}` +
		`?v=${env.FOURSQUARE_API_VERSION}` +
		`&oauth_token=${env.FOURSQUARE_ACCESS_TOKEN}`);

	return await response.json();
}

function getVenueAddress(formattedAddress) {
	const venueAddress = formattedAddress.at(-1);
	if (utils.isZipCode(venueAddress)) {
		return formattedAddress.at(-2);
	}

	return venueAddress;
}

export async function createTweetText(env, checkinId) {
	const data = await getCheckinDetails(env, checkinId);
	const checkin = data.response.checkin;
	if (!checkin) {
		// If check-in details cannot be fetched.
		return "";
	}

	// Please comment out if you want to posts all check-ins.
	if (!checkin.shares?.twitter) {
		return "";
	}

	const venue = checkin.venue;
	const venueName = venue.name;
	const venueAddress = getVenueAddress(venue.location.formattedAddress);
	const shareUrl = checkin.checkinShortUrl;

	return `I'm at ${venueName} in ${venueAddress}\n` + shareUrl;
}
