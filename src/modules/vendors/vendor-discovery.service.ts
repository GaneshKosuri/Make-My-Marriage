import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { DiscoveredVendorDto, VendorDiscoveryQuery } from "./vendor.types";

/**
 * Vendor discovery orchestration (PRD §9.17; SYSTEM_DESIGN §34, §84; API_DESIGN §65–66). Phase 4.
 * Coordinates default to the wedding location; category → VENDOR_DISCOVERY_KEYWORDS;
 * provider calls go through getVendorDiscoveryService() (never the Google SDK/API directly).
 * Provider failures surface as EXTERNAL_SERVICE_ERROR without breaking the rest of the app.
 */
export const vendorDiscoveryService = {
  async search(ctx: MemberContext, query: VendorDiscoveryQuery): Promise<DiscoveredVendorDto[]> {
    return notImplemented("API_DESIGN §65–66 (Phase 4: Financial & Vendors)");
  },
};
