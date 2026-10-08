import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  configureIdentity,
  resetIdentityForTests,
  type IdentityMembership,
  type IdentityPorts,
  type SessionRecord,
} from "@/server/auth/identity";
import { resetEnvForTests } from "@/server/config/env";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";
import { createRateLimiter, setRateLimiterForTests } from "@/server/security/rate-limit";
import { generateToken, hashToken } from "@/server/security/tokens";

import { objectId } from "./params";
import { notImplemented, ok } from "./responses";
import { route } from "./route";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const WEDDING_ID = "65abc0000000000000000001";

// ── Fake identity ports: sessions + memberships in memory ────────────────────

interface FakeUser {
  token: string;
  userId: string;
  membership: IdentityMembership | null;
}

function makeUser(userId: string, membership: IdentityMembership | null): FakeUser {
  return { token: generateToken(), userId, membership };
}

const admin = makeUser("65abc00000000000000000a1", {
  membershipId: "65abc00000000000000000b1",
  weddingId: WEDDING_ID,
  role: "ADMIN",
});
const manager = makeUser("65abc00000000000000000a2", {
  membershipId: "65abc00000000000000000b2",
  weddingId: WEDDING_ID,
  role: "MANAGER",
});
const noWedding = makeUser("65abc00000000000000000a3", null);
const expired = makeUser("65abc00000000000000000a4", null);

function fakePorts(): IdentityPorts {
  const sessions = new Map<string, SessionRecord>();
  for (const user of [admin, manager, noWedding, expired]) {
    sessions.set(hashToken("session", user.token), {
      sessionId: `session-${user.userId}`,
      userId: user.userId,
      expiresAt: new Date(Date.now() + (user === expired ? -1000 : 3_600_000)),
      lastUsedAt: new Date(),
    });
  }
  const byUser = new Map([admin, manager, noWedding].map((u) => [u.userId, u.membership]));
  return {
    sessions: {
      create: vi.fn(),
      findByTokenHash: async (hash) => sessions.get(hash) ?? null,
      touch: async () => undefined,
      deleteByTokenHash: async () => undefined,
      deleteAllForUser: async () => 0,
    },
    directory: {
      findUserById: async (id) => ({ id, name: "Test", email: "t@example.com" }),
      findMembershipByUserId: async (id) => byUser.get(id) ?? null,
      findWeddingById: async () => null,
    },
  };
}

// ── Request helpers ──────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  as?: FakeUser;
  origin?: string | null;
  headers?: Record<string, string>;
  body?: string;
  json?: unknown;
}

function request(path: string, options: RequestOptions = {}): NextRequest {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  const isMutation = method !== "GET";
  const origin = options.origin === undefined ? (isMutation ? APP_URL : null) : options.origin;
  if (origin) headers.set("origin", origin);
  if (options.as) headers.set("cookie", `mmm_session=${options.as.token}`);
  let body = options.body;
  if (options.json !== undefined) {
    body = JSON.stringify(options.json);
    headers.set("content-type", "application/json");
  }
  return new NextRequest(new URL(path, APP_URL), { method, headers, body });
}

const context = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  configureIdentity(fakePorts());
  vi.spyOn(logger, "error").mockImplementation(() => undefined);
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  setRateLimiterForTests(undefined);
});

afterAll(() => resetIdentityForTests());

// ── Tests ────────────────────────────────────────────────────────────────────

describe("route(): envelopes and headers", () => {
  it("wraps data, sets no-store and a request id", async () => {
    const GET = route({ auth: "public", handler: () => ok({ hello: "world" }) });
    const response = await GET(request("/api/x"), context());
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ data: { hello: "world" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("notImplemented(phase) → 501 NOT_IMPLEMENTED", async () => {
    const GET = route({ auth: "public", handler: () => notImplemented("Phase 2: Planning") });
    const response = await GET(request("/api/x"), context());
    expect(response.status).toBe(501);
    expect(await json(response)).toEqual({
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Not implemented yet (Phase 2: Planning).",
        details: { phase: "Phase 2: Planning" },
      },
    });
  });

  it("exposes its auth level as metadata", () => {
    expect(route({ auth: "admin", handler: () => ok(null) }).metadata).toEqual({
      auth: "admin",
      rateLimits: [],
    });
  });
});

describe("route(): errors", () => {
  it("maps AppError to its envelope and status", async () => {
    const GET = route({
      auth: "public",
      handler: () => {
        throw new AppError("LAST_ADMIN", undefined, { details: { role: "At least one Admin" } });
      },
    });
    const response = await GET(request("/api/x"), context());
    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({
      error: {
        code: "LAST_ADMIN",
        message: "A wedding must always have at least one Admin.",
        details: { role: "At least one Admin" },
      },
    });
  });

  it("turns unknown errors into a generic 500 without leaking internals, and logs the request id", async () => {
    const GET = route({
      auth: "public",
      handler: () => {
        throw new Error("Mongo exploded at 10.0.0.5 with password=hunter2");
      },
    });
    const response = await GET(request("/api/x"), context());
    const body = await json(response);
    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    });
    expect(JSON.stringify(body)).not.toMatch(/Mongo|hunter2|stack/);
    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled error in route handler",
      expect.objectContaining({ requestId: response.headers.get("x-request-id") }),
    );
  });
});

describe("route(): validation", () => {
  const PATCH = route({
    auth: "public",
    params: z.object({ taskId: objectId }).strict(),
    query: z.object({ verbose: z.enum(["true", "false"]).optional() }).strict(),
    body: z.object({ title: z.string().min(1), priority: z.enum(["LOW", "HIGH"]) }).strict(),
    handler: ({ params, query, body }) => ok({ params, query, body }),
  });

  it("passes parsed params, query and body to the handler", async () => {
    const response = await PATCH(
      request("/api/tasks/x?verbose=true", {
        method: "PATCH",
        json: { title: "Book DJ", priority: "HIGH" },
      }),
      context({ taskId: WEDDING_ID }),
    );
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({
      params: { taskId: WEDDING_ID },
      query: { verbose: "true" },
      body: { title: "Book DJ", priority: "HIGH" },
    });
  });

  it("returns per-field details, including unknown keys like a client weddingId", async () => {
    const response = await PATCH(
      request("/api/tasks/x?nope=1", {
        method: "PATCH",
        json: { title: "", priority: "URGENT", weddingId: "65abc0000000000000000999" },
      }),
      context({ taskId: WEDDING_ID }),
    );
    expect(response.status).toBe(400);
    const { error } = (await json(response)) as {
      error: { code: string; details: Record<string, string> };
    };
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(error.details).sort()).toEqual([
      "priority",
      "query.nope",
      "title",
      "weddingId",
    ]);
    expect(error.details.weddingId).toBe("Unknown field");
  });

  it("rejects malformed ObjectIds before any database access (API_DESIGN §95)", async () => {
    const response = await PATCH(
      request("/api/tasks/x", { method: "PATCH", json: { title: "a", priority: "LOW" } }),
      context({ taskId: "not-an-id" }),
    );
    expect(response.status).toBe(400);
    expect(((await json(response)) as { error: { details: unknown } }).error.details).toEqual({
      "params.taskId": "Invalid id",
    });
  });

  it("can answer malformed token params with a generic 404", async () => {
    const GET = route({
      auth: "public",
      params: z.object({ token: z.string().length(43) }).strict(),
      invalidParams: "NOT_FOUND",
      handler: () => ok(null),
    });
    const response = await GET(request("/api/public/invitations/x"), context({ token: "x" }));
    expect(response.status).toBe(404);
    expect(await json(response)).toEqual({ error: { code: "NOT_FOUND", message: "Not found." } });
  });
});

describe("route(): JSON body", () => {
  const POST = route({
    auth: "public",
    body: z.object({ note: z.string() }).strict(),
    handler: ({ body }) => ok(body),
  });

  it("caps bodies at 8 KiB", async () => {
    const big = JSON.stringify({ note: "x".repeat(9 * 1024) });
    const response = await POST(
      request("/api/x", {
        method: "POST",
        body: big,
        headers: { "content-type": "application/json" },
      }),
      context(),
    );
    expect(response.status).toBe(400);
    expect(((await json(response)) as { error: { details: unknown } }).error.details).toEqual({
      body: "Must be at most 8192 bytes",
    });
  });

  it("accepts bodies just under the cap", async () => {
    const body = JSON.stringify({ note: "x".repeat(8 * 1024 - 20) });
    const response = await POST(
      request("/api/x", { method: "POST", body, headers: { "content-type": "application/json" } }),
      context(),
    );
    expect(response.status).toBe(200);
  });

  it("rejects malformed JSON and non-JSON content types", async () => {
    const malformed = await POST(
      request("/api/x", {
        method: "POST",
        body: "{nope",
        headers: { "content-type": "application/json" },
      }),
      context(),
    );
    expect(malformed.status).toBe(400);

    const form = await POST(
      request("/api/x", {
        method: "POST",
        body: "note=hi",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }),
      context(),
    );
    expect(form.status).toBe(400);
  });
});

describe("route(): Origin check on mutations (API_DESIGN §100)", () => {
  const POST = route({ auth: "public", handler: () => ok("done") });
  const GET = route({ auth: "public", handler: () => ok("read") });

  it("accepts the configured origin", async () => {
    expect((await POST(request("/api/x", { method: "POST" }), context())).status).toBe(200);
  });

  it("rejects a foreign or missing Origin", async () => {
    for (const origin of ["https://evil.example", null]) {
      const response = await POST(request("/api/x", { method: "POST", origin }), context());
      expect(response.status).toBe(403);
      expect(((await json(response)) as { error: { code: string } }).error.code).toBe("FORBIDDEN");
    }
  });

  it("does not apply to reads or to the internal cron route", async () => {
    expect((await GET(request("/api/x", { origin: null }), context())).status).toBe(200);
    const INTERNAL = route({ auth: "internal", handler: () => ok("ran") });
    const response = await INTERNAL(
      request("/api/internal/jobs/email", {
        method: "POST",
        origin: null,
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      }),
      context(),
    );
    expect(response.status).toBe(200);
  });
});

describe("route(): auth levels", () => {
  const capture = <A extends "user" | "member" | "admin">(auth: A) =>
    route({ auth, handler: ({ ctx }) => ok(ctx) });

  it("user: requires a valid, unexpired session", async () => {
    const GET = capture("user");
    expect((await GET(request("/api/auth/me"), context())).status).toBe(401);
    expect(
      (
        await GET(
          request("/api/auth/me", { headers: { cookie: "mmm_session=garbage" } }),
          context(),
        )
      ).status,
    ).toBe(401);
    expect((await GET(request("/api/auth/me", { as: expired }), context())).status).toBe(401);

    const response = await GET(request("/api/auth/me", { as: noWedding }), context());
    expect(response.status).toBe(200);
    expect((await json(response)).data).toMatchObject({
      userId: noWedding.userId,
      sessionId: expect.any(String),
    });
  });

  it("member: requires a membership; wedding context comes only from it", async () => {
    const GET = capture("member");
    expect((await GET(request("/api/tasks"), context())).status).toBe(401);
    expect((await GET(request("/api/tasks", { as: noWedding }), context())).status).toBe(403);

    const response = await GET(
      request("/api/tasks?weddingId=someone-else", { as: manager }),
      context(),
    );
    expect(response.status).toBe(200);
    expect((await json(response)).data).toEqual({
      requestId: expect.any(String),
      userId: manager.userId,
      membershipId: manager.membership?.membershipId,
      weddingId: WEDDING_ID,
      role: "MANAGER",
    });
  });

  it("admin: Managers are forbidden, Admins pass", async () => {
    const DELETE = capture("admin");
    const asManager = await DELETE(
      request("/api/members/x", { method: "DELETE", as: manager }),
      context(),
    );
    expect(asManager.status).toBe(403);
    expect(((await json(asManager)) as { error: { code: string } }).error.code).toBe("FORBIDDEN");

    const asAdmin = await DELETE(
      request("/api/members/x", { method: "DELETE", as: admin }),
      context(),
    );
    expect(asAdmin.status).toBe(200);
    expect((await json(asAdmin)).data).toMatchObject({ role: "ADMIN" });
  });

  it("internal: Bearer CRON_SECRET, compared in constant time; fails closed when unset", async () => {
    const GET = route({ auth: "internal", handler: () => ok("ran") });
    const call = (authorization?: string) =>
      GET(
        request("/api/internal/jobs/email", { headers: authorization ? { authorization } : {} }),
        context(),
      );

    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong-secret")).status).toBe(401);
    expect((await call(CRON_SECRET)).status).toBe(401); // missing "Bearer "
    expect((await call(`Bearer ${CRON_SECRET}`)).status).toBe(200);

    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    try {
      expect((await call(`Bearer ${CRON_SECRET}`)).status).toBe(401);
    } finally {
      process.env.CRON_SECRET = saved;
      resetEnvForTests();
    }
  });
});

describe("route(): rate limiting", () => {
  it("applies the policy after validation and answers 429 with Retry-After", async () => {
    const counts = new Map<string, number>();
    setRateLimiterForTests(
      createRateLimiter({
        store: {
          async increment(key) {
            counts.set(key, (counts.get(key) ?? 0) + 1);
            return counts.get(key) ?? 0;
          },
        },
      }),
    );
    const POST = route({
      auth: "public",
      body: z.object({ email: z.email() }).strict(),
      rateLimit: { name: "test.login", limit: 2, windowMs: 60_000, scope: "ip" },
      handler: () => ok("ok"),
    });
    const send = (email: string) =>
      POST(
        request("/api/auth/login", {
          method: "POST",
          json: { email },
          headers: { "x-forwarded-for": "203.0.113.7" },
        }),
        context(),
      );

    // Invalid input is rejected before counters are touched.
    expect((await send("not-an-email")).status).toBe(400);
    expect(counts.size).toBe(0);

    expect((await send("a@example.com")).status).toBe(200);
    expect((await send("a@example.com")).status).toBe(200);
    const limited = await send("a@example.com");
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(((await json(limited)) as { error: { code: string } }).error.code).toBe("RATE_LIMITED");
  });
});
