import { describe, expect, it } from "vitest";

import { AppError } from "@/server/errors";

import {
  createRateLimiter,
  policies,
  windowStartFor,
  type RateLimitPolicy,
  type RateLimitStore,
} from "./rate-limit";

/** In-memory stand-in for the MongoDB `$inc` upsert store; records keys it saw. */
function memoryStore() {
  const counts = new Map<string, number>();
  const store: RateLimitStore & { counts: Map<string, number> } = {
    counts,
    async increment(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
  };
  return store;
}

const MINUTE = 60_000;
const policy: RateLimitPolicy = { name: "test.policy", limit: 2, windowMs: MINUTE, scope: "ip" };

function limiterAt(clock: { now: number }, store = memoryStore()) {
  return {
    store,
    limiter: createRateLimiter({ store, now: () => clock.now, hashKey: (raw) => `h(${raw})` }),
  };
}

describe("fixed windows", () => {
  it("aligns windows to multiples of the window size", () => {
    expect(windowStartFor(125_000, MINUTE)).toBe(120_000);
    expect(windowStartFor(120_000, MINUTE)).toBe(120_000);
  });

  it("allows up to the limit, then rejects with Retry-After until the window resets", async () => {
    const clock = { now: 10 * MINUTE + 15_000 };
    const { limiter } = limiterAt(clock);

    expect((await limiter.consume(policy, "1.2.3.4")).allowed).toBe(true);
    expect((await limiter.consume(policy, "1.2.3.4")).remaining).toBe(0);

    const rejected = await limiter.consume(policy, "1.2.3.4");
    expect(rejected.allowed).toBe(false);
    expect(rejected.retryAfterSeconds).toBe(45);
    expect(rejected.resetAt.getTime()).toBe(11 * MINUTE);

    clock.now = 11 * MINUTE; // next window
    expect((await limiter.consume(policy, "1.2.3.4")).allowed).toBe(true);
  });

  it("counts subjects independently", async () => {
    const { limiter } = limiterAt({ now: 0 });
    await limiter.consume(policy, "a");
    await limiter.consume(policy, "a");
    expect((await limiter.consume(policy, "a")).allowed).toBe(false);
    expect((await limiter.consume(policy, "b")).allowed).toBe(true);
  });

  it("stores only hashed keys, never the raw subject", async () => {
    const store = memoryStore();
    const limiter = createRateLimiter({ store, now: () => 0 }); // real HMAC
    await limiter.consume(policy, "203.0.113.9");
    const [key] = [...store.counts.keys()];
    expect(key).not.toContain("203.0.113.9");
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("consumeInOrder (RSVP: per-invitation before global, API_DESIGN §51)", () => {
  it("does not spend the shared counter when the first step rejects", async () => {
    const { limiter, store } = limiterAt({ now: 0 });
    const perInvitation = { ...policies.rsvpPerInvitation, limit: 1 };
    const steps = [
      { policy: perInvitation, subject: "token-1" },
      { policy: policies.rsvpGlobal, subject: "global" },
    ];

    expect((await limiter.consumeInOrder(steps)).allowed).toBe(true);
    const rejected = await limiter.consumeInOrder(steps);
    expect(rejected.allowed).toBe(false);
    expect(rejected.policy?.name).toBe(perInvitation.name);

    const globalCount = [...store.counts.entries()].find(([key]) =>
      key.includes(policies.rsvpGlobal.name),
    )?.[1];
    expect(globalCount).toBe(1);
  });

  it("enforce() throws RATE_LIMITED with a Retry-After header", async () => {
    const { limiter } = limiterAt({ now: 0 });
    const tight = { ...policy, limit: 0 };
    const error = await limiter.enforce([{ policy: tight, subject: "x" }]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("RATE_LIMITED");
    expect((error as AppError).httpStatus).toBe(429);
    expect((error as AppError).headers?.["Retry-After"]).toBe("60");
  });
});

describe("named policies (API_DESIGN §99)", () => {
  it("cover every documented endpoint with sane values", () => {
    for (const name of [
      "login",
      "signup",
      "forgotPassword",
      "resetPassword",
      "publicInvitationView",
      "rsvpPerInvitation",
      "rsvpGlobal",
      "galleryUploadUrl",
      "galleryPhotoConfirm",
    ] as const) {
      expect(policies[name].limit).toBeGreaterThan(0);
      expect(policies[name].windowMs).toBeGreaterThan(0);
    }
    expect(policies.rsvpPerInvitation).toMatchObject({ limit: 20, windowMs: 15 * MINUTE });
    expect(policies.rsvpGlobal).toMatchObject({ limit: 300, windowMs: MINUTE });
  });
});
