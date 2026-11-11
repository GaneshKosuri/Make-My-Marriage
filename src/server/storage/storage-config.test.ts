import { describe, expect, it, vi } from "vitest";

// Production without R2 or Places keys (decided 2026-11-11: not required at startup).
vi.mock("@/server/config/env", () => ({ getEnv: () => ({ NODE_ENV: "production" }) }));

const { getStorageService } = await import("./index");
const { getVendorDiscoveryService } = await import("@/server/places");

describe("integrations not configured in production", () => {
  it("refuses to use fake storage, which would lose uploads", () => {
    expect(() => getStorageService()).toThrow(/Storage is not configured: set R2_ACCOUNT_ID/);
  });

  it("refuses to use fake vendor search, which returns sample vendors", () => {
    expect(() => getVendorDiscoveryService()).toThrow(/set GOOGLE_PLACES_API_KEY/);
  });
});
