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
	const venueLocation = getVenueLocationText(venue.location);
	const shareUrl = checkin.checkinShortUrl;

	return `I'm at ${venueName}${venueLocation}\n` + shareUrl;
}
