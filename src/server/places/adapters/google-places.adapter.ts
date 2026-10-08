import "server-only";

import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import type { VendorDiscoveryService } from "../types";

/**
 * Maps any provider failure (e.g. Google's REQUEST_DENIED, OVER_QUERY_LIMIT)
 * to the generic EXTERNAL_SERVICE_ERROR (API_DESIGN §103). Provider detail is
 * logged, never returned.
 */
export function toVendorDiscoveryError(providerStatus: string, cause?: unknown): AppError {
  logger.error("Vendor discovery provider error", { providerStatus });
  return new AppError("EXTERNAL_SERVICE_ERROR", "Vendor discovery is temporarily unavailable.", {
    cause,
  });
}

/**
 * Google Places adapter. Signatures only until Phase 4 (Financial & Vendors);
 * requests always originate from the backend so the key never reaches browsers.
 */
export function createGooglePlacesAdapter(_apiKey: string): VendorDiscoveryService {
  return {
    adapterName: "google-places",
    async search() {
      throw new AppError(
        "NOT_IMPLEMENTED",
        "Vendor discovery arrives in Phase 4 (API_DESIGN §65–66).",
      );
    },
    async getPlaceDetails() {
      throw new AppError(
        "NOT_IMPLEMENTED",
        "Vendor discovery arrives in Phase 4 (API_DESIGN §61).",
      );
    },
  };
}
