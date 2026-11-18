import { describe, it } from "vitest";

/**
 * Test plan for vendorsService / vendorDiscoveryService (Phase 4: Financial & Vendors). Replace each
 * `it.todo` with a real test when the behaviour is implemented; DB-backed cases belong in
 * tests/integration.
 */
describe("vendorsService / vendorDiscoveryService", () => {
  // Covered end to end in tests/integration/vendors.test.ts: vendor CRUD (API_DESIGN §59–64),
  // source=MANUAL, literal search, archived vendors only on request, versioned updates
  // (CONFLICT), archived vendors read-only, DELETE archives, linked events active and of this
  // wedding, cross-wedding 404s, the dashboard count.
  describe("add from Google (API_DESIGN §61)", () => {
    it.todo("from-place fetches trusted details server-side and sets source=GOOGLE_PLACES");
    it.todo("the same Google place cannot be added twice to a wedding");
  });
  describe("discovery (API_DESIGN §65–66, §103)", () => {
    it.todo("defaults the search place to the wedding's city");
    it.todo("provider failures become EXTERNAL_SERVICE_ERROR without provider detail");
  });
});
