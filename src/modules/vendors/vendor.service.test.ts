import { describe, it } from "vitest";

/**
 * Test plan for vendorsService / vendorDiscoveryService (Phase 4: Financial & Vendors). Replace each `it.todo` with a real test
 * when the behaviour is implemented; DB-backed cases belong in tests/integration.
 */
describe("vendorsService / vendorDiscoveryService", () => {
  describe("vendors (API_DESIGN §59–64)", () => {
    it.todo("manual vendors get source=MANUAL");
    it.todo("from-place fetches trusted details server-side and sets source=GOOGLE_PLACES");
    it.todo("the same Google place cannot be added twice to a wedding");
    it.todo("DELETE archives");
  });
  describe("discovery (API_DESIGN §65–66, §103)", () => {
    it.todo("defaults coordinates to the wedding location");
    it.todo("provider failures become EXTERNAL_SERVICE_ERROR without provider detail");
  });
});
