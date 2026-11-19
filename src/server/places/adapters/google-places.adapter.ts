import "server-only";

import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { DiscoveredPlace, PlaceDetails, VendorDiscoveryService } from "../types";

/**
 * Maps any provider failure (e.g. Google's PERMISSION_DENIED, RESOURCE_EXHAUSTED,
 * a timeout) to the generic EXTERNAL_SERVICE_ERROR (API_DESIGN §103). Provider
 * detail is logged, never returned.
 */
export function toVendorDiscoveryError(providerStatus: string, cause?: unknown): AppError {
  logger.error("Vendor discovery provider error", { providerStatus });
  return new AppError("EXTERNAL_SERVICE_ERROR", "Vendor discovery is temporarily unavailable.", {
    cause,
  });
}

const BASE_URL = "https://places.googleapis.com/v1";
const TIMEOUT_MS = 8_000;

/**
 * Field masks: only what the UI shows (API_DESIGN §66), which also keeps the
 * billed SKU down. Ratings put searches on the Enterprise SKU; see the launch list.
 */
const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
].join(",");
const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "internationalPhoneNumber",
  "nationalPhoneNumber",
  "websiteUri",
].join(",");

/** The subset of a Places (New) `Place` we ask for. */
interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

interface GoogleError {
  error?: { code?: number; status?: string };
}

type Fetch = typeof fetch;

function toDiscoveredPlace(place: GooglePlace): DiscoveredPlace | null {
  const name = place.displayName?.text?.trim();
  if (!place.id || !name) return null;
  return {
    googlePlaceId: place.id,
    name,
    rating: typeof place.rating === "number" ? place.rating : null,
    ratingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    address: place.formattedAddress?.trim() || null,
  };
}

/** Our text query: "wedding photographer candid in Dehradun, Uttarakhand". */
export function buildTextQuery(keyword: string, near: string, query?: string): string {
  return [keyword, query?.trim(), "in", near.trim()].filter(Boolean).join(" ");
}

/**
 * Google Places (New) adapter: Text Search and Place Details over REST.
 * Requests always originate from the backend so the key never reaches browsers;
 * the key is sent as a header, never in a URL that could be logged.
 */
export function createGooglePlacesAdapter(
  apiKey: string,
  fetchImpl: Fetch = fetch,
): VendorDiscoveryService {
  async function call(
    url: string,
    init: RequestInit & { fieldMask: string },
    operation: string,
  ): Promise<unknown> {
    const { fieldMask, ...rest } = init;
    let response: Response;
    try {
      response = await fetchImpl(url, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "unknown";
      throw toVendorDiscoveryError(
        `${operation}: ${name === "TimeoutError" ? "timeout" : "network"}`,
        error,
      );
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const status = (body as GoogleError | null)?.error?.status ?? "UNKNOWN";
      // An unknown or malformed place id: the place simply isn't there.
      if (operation === "details" && (response.status === 404 || status === "INVALID_ARGUMENT")) {
        throw new AppError("NOT_FOUND");
      }
      throw toVendorDiscoveryError(`${operation}: HTTP ${response.status} ${status}`);
    }
    return body;
  }

  return {
    adapterName: "google-places",

    async search({ keyword, near, query, maxResults = 20 }) {
      const body = (await call(
        `${BASE_URL}/places:searchText`,
        {
          method: "POST",
          fieldMask: SEARCH_FIELDS,
          body: JSON.stringify({
            textQuery: buildTextQuery(keyword, near, query),
            languageCode: "en",
            regionCode: "IN",
            pageSize: maxResults,
          }),
        },
        "search",
      )) as { places?: GooglePlace[] } | null;
      return (body?.places ?? [])
        .map(toDiscoveredPlace)
        .filter((place): place is DiscoveredPlace => place !== null);
    },

    async getPlaceDetails(googlePlaceId): Promise<PlaceDetails> {
      const url = `${BASE_URL}/places/${encodeURIComponent(googlePlaceId)}?languageCode=en&regionCode=IN`;
      const place = (await call(
        url,
        { method: "GET", fieldMask: DETAILS_FIELDS },
        "details",
      )) as GooglePlace | null;
      const discovered = place ? toDiscoveredPlace(place) : null;
      if (!place || !discovered) throw toVendorDiscoveryError("details: incomplete place");
      return {
        ...discovered,
        phone: place.internationalPhoneNumber?.trim() || place.nationalPhoneNumber?.trim() || null,
        website: place.websiteUri?.trim() || null,
      };
    },
  };
}
