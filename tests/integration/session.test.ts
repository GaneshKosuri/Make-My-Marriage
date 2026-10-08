import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { SessionModel } from "@/modules/auth/session.model";
import {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  resolveSession,
  SESSION_TOUCH_INTERVAL_MS,
} from "@/server/auth/session";
import { hashToken } from "@/server/security/tokens";

const userId = () => new Types.ObjectId().toString();

describe("server-side sessions (SYSTEM_DESIGN §10–11, DATABASE_DESIGN §9–11)", () => {
  it("create → resolve → destroy round trip", async () => {
    const owner = userId();
    const created = await createSession(owner);
    expect(created.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const resolved = await resolveSession(created.token);
    expect(resolved).toMatchObject({ sessionId: created.sessionId, userId: owner });

    await destroySession(created.token);
    expect(await resolveSession(created.token)).toBeNull();
  });

  it("stores only the HMAC of the token", async () => {
    const created = await createSession(userId());
    const stored = await SessionModel.findById(created.sessionId).select("+tokenHash").lean();
    expect(stored?.tokenHash).toBe(hashToken("session", created.token));
    expect(JSON.stringify(stored)).not.toContain(created.token);
  });

  it("expires after SESSION_TTL_DAYS (default 30)", async () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    const created = await createSession(userId(), now);
    expect(created.expiresAt.toISOString()).toBe("2027-01-31T00:00:00.000Z");
    expect(
      await resolveSession(created.token, new Date("2027-01-30T23:59:59.000Z")),
    ).not.toBeNull();
    expect(await resolveSession(created.token, new Date("2027-01-31T00:00:00.000Z"))).toBeNull();
  });

  it("throttles lastUsedAt updates", async () => {
    const t0 = new Date();
    const created = await createSession(userId(), t0);

    await resolveSession(created.token, t0);
    const first = (await SessionModel.findById(created.sessionId).lean())?.lastUsedAt;
    expect(first?.getTime()).toBe(t0.getTime());

    await resolveSession(created.token, new Date(t0.getTime() + 1000));
    expect((await SessionModel.findById(created.sessionId).lean())?.lastUsedAt?.getTime()).toBe(
      t0.getTime(),
    );

    const later = new Date(t0.getTime() + SESSION_TOUCH_INTERVAL_MS + 1);
    await resolveSession(created.token, later);
    expect((await SessionModel.findById(created.sessionId).lean())?.lastUsedAt?.getTime()).toBe(
      later.getTime(),
    );
  });

  it("ignores malformed and unknown tokens", async () => {
    expect(await resolveSession(undefined)).toBeNull();
    expect(await resolveSession("garbage")).toBeNull();
    expect(await resolveSession("A".repeat(43))).toBeNull();
  });

  it("destroys every session of a user (e.g. after a password reset)", async () => {
    const owner = userId();
    const a = await createSession(owner);
    const b = await createSession(owner);
    const other = await createSession(userId());

    expect(await destroyAllSessionsForUser(owner)).toBe(2);
    expect(await resolveSession(a.token)).toBeNull();
    expect(await resolveSession(b.token)).toBeNull();
    expect(await resolveSession(other.token)).not.toBeNull();
  });
});
