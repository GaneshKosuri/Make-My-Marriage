import "server-only";

import { AppError } from "@/server/errors";

import type { DiscoveredPlace, PlaceDetails, VendorDiscoveryService } from "../types";

const SAMPLE_PLACES: readonly PlaceDetails[] = [
  {
    googlePlaceId: "fake-place-1",
    name: "Sample Wedding Photography",
    rating: 4.7,
    ratingCount: 120,
    address: "Rajpur Road, Dehradun, Uttarakhand",
    latitude: 30.3456,
    longitude: 78.0612,
    phone: "+91 90000 00001",
    website: "https://example.com/photography",
  },
  {
    googlePlaceId: "fake-place-2",
    name: "Sample Banquet & Lawns",
    rating: 4.3,
    ratingCount: 87,
    address: "Sahastradhara Road, Dehradun, Uttarakhand",
    latitude: 30.3667,
    longitude: 78.0901,
    phone: null,
    website: null,
  },
];

/** Canned results for tests and local development without a Google key. */
export function createFakeVendorDiscoveryAdapter(): VendorDiscoveryService {
  return {
    adapterName: "fake",
    async search({ maxResults = 20 }): Promise<DiscoveredPlace[]> {
      return SAMPLE_PLACES.slice(0, maxResults).map(
        ({ phone: _phone, website: _website, ...place }) => place,
      );
    },
    async getPlaceDetails(googlePlaceId) {
      const place = SAMPLE_PLACES.find((candidate) => candidate.googlePlaceId === googlePlaceId);
      if (!place) throw new AppError("NOT_FOUND");
      return place;
    },
  };
}
