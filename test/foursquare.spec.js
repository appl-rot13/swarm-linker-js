import { describe, it, expect } from "vitest";
import { createShareContents } from "../src/foursquare.js";
import { createEnv, createCheckinDetails } from "./test-utils.js";

describe("createShareContents", () => {
	describe("when a check-in is available", () => {
		it.each([
			{
				case: "the city and state are available",
				expected: {
					text: "I'm at <Venue Name> in <City>, <State>\n",
					url: "<URL>",
				},
			},
			{
				case: "the formatted address contains a postal code",
				modifier: (checkin) => {
					delete checkin.venue.location.city;
				},
				expected: {
					text: "I'm at <Venue Name> in <Address>\n",
					url: "<URL>",
				},
			},
			{
				case: "the formatted address does not contain a postal code",
				modifier: (checkin) => {
					delete checkin.venue.location.state;
					checkin.venue.location.formattedAddress.pop();
				},
				expected: {
					text: "I'm at <Venue Name> in <Address>\n",
					url: "<URL>",
				},
			},
			{
				case: "only the state is available",
				modifier: (checkin) => {
					delete checkin.venue.location.city;
					checkin.venue.location.formattedAddress = [];
				},
				expected: {
					text: "I'm at <Venue Name> in <State>\n",
					url: "<URL>",
				},
			},
			{
				case: "only the city is available",
				modifier: (checkin) => {
					delete checkin.venue.location.state;
					delete checkin.venue.location.formattedAddress;
				},
				expected: {
					text: "I'm at <Venue Name> in <City>\n",
					url: "<URL>",
				},
			},
			{
				case: "no location data is available",
				modifier: (checkin) => {
					delete checkin.venue.location.city;
					delete checkin.venue.location.state;
					delete checkin.venue.location.formattedAddress;
				},
				expected: {
					text: "I'm at <Venue Name>\n",
					url: "<URL>",
				},
			},
		])("formats the share content when $case", async ({ modifier, expected }) => {
			const cachedCheckin = createCheckinDetails(modifier);
			const env = createEnv(cachedCheckin);

			expect(await createShareContents(env)).toEqual(expected);
		});
	});

	describe("when a check-in is not available", () => {
		it("returns an empty object", async () => {
			const env = createEnv();

			expect(await createShareContents(env)).toEqual({});
		});
	});
});
