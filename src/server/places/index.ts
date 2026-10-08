import "server-only";

import { getEnv } from "@/server/config/env";

import { createFakeVendorDiscoveryAdapter } from "./adapters/fake.adapter";
import { createGooglePlacesAdapter } from "./adapters/google-places.adapter";
import type { VendorDiscoveryService } from "./types";

export { createFakeVendorDiscoveryAdapter } from "./adapters/fake.adapter";
export { toVendorDiscoveryError } from "./adapters/google-places.adapter";
export type {
  DiscoveredPlace,
  PlaceDetails,
  PlaceSearchInput,
  VendorDiscoveryService,
} from "./types";

let discoveryService: VendorDiscoveryService | undefined;

/** Adapter selection: test → fake; GOOGLE_PLACES_API_KEY → Google; otherwise (dev) → fake. */
export function getVendorDiscoveryService(): VendorDiscoveryService {
  if (discoveryService) return discoveryService;
  const env = getEnv();
  discoveryService =
    env.NODE_ENV !== "test" && env.GOOGLE_PLACES_API_KEY
      ? createGooglePlacesAdapter(env.GOOGLE_PLACES_API_KEY)
      : createFakeVendorDiscoveryAdapter();
  return discoveryService;
}

/** Tests only. */
export function setVendorDiscoveryServiceForTests(
  service: VendorDiscoveryService | undefined,
): void {
  discoveryService = service;
}
