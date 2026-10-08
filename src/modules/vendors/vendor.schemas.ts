/** Vendor and discovery request schemas (Zod, `.strict()`). Isomorphic. */
import { z } from "zod";

import { objectId } from "@/lib/object-id";

export const vendorIdParams = z.object({ vendorId: objectId }).strict();

/*
 * TODO(Phase 4: Financial & Vendors) — define with `.strict()`:
 *   - listVendorsQuerySchema     API_DESIGN §59  pageQuerySchema + category, search, includeArchived
 *   - createVendorSchema         API_DESIGN §60  name, category, contacts, totalAgreedCostPaise (int ≥ 0), eventIds
 *   - addVendorFromPlaceSchema   API_DESIGN §61  { googlePlaceId } only — details are fetched server-side
 *   - updateVendorSchema         API_DESIGN §63  partial
 *   - discoverySearchQuerySchema API_DESIGN §65  category, query?, latitude?, longitude? (default: wedding location)
 */
