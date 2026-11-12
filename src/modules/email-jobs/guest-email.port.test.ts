import { afterEach, describe, expect, it, vi } from "vitest";

import type { GuestEmailPort } from "./guest-email.port";

const registry = globalThis as typeof globalThis & { __mmmGuestEmailPort?: GuestEmailPort };
const before = registry.__mmmGuestEmailPort;
afterEach(() => {
  registry.__mmmGuestEmailPort = before;
});

const port: GuestEmailPort = { compose: async () => null, delivered: async () => undefined };

describe("guest email port", () => {
  it("is shared by every copy of the module, as Next.js loads one per server bundle (QA P1-1)", async () => {
    // src/instrumentation.ts registers it in one bundle…
    vi.resetModules();
    const atStartup = await import("./guest-email.port");
    atStartup.configureGuestEmails(port);

    // …and the route handlers run the worker from another copy of the module.
    vi.resetModules();
    const inRouteHandler = await import("./guest-email.port");
    expect(inRouteHandler).not.toBe(atStartup);
    expect(inRouteHandler.getGuestEmailPort()).toBe(port);
  });
});
