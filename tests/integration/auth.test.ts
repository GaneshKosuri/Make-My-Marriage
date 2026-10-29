import { randomBytes } from "node:crypto";

import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { PasswordResetTokenModel } from "@/modules/auth/password-reset-token.model";
import { SessionModel } from "@/modules/auth/session.model";
import { UserModel } from "@/modules/auth/user.model";
import {
  createEmailService,
  createFakeEmailAdapter,
  setEmailServiceForTests,
} from "@/server/email";
import { hashToken } from "@/server/security/tokens";

import { addMember, createWedding } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/**
 * Authentication end to end through the route handlers (API_DESIGN §11–16):
 * validation, rate limits, cookies, MongoDB and the email service.
 */

type Handler = (request: NextRequest) => Promise<Response>;
interface ApiBody {
  data?: Record<string, unknown>;
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}

// A fresh client IP per request keeps the per-IP rate limits out of unrelated tests.
const randomIp = () => `10.${[1, 2, 3].map(() => randomBytes(1)[0]).join(".")}`;

async function call(
  handler: Handler,
  { body, cookie, ip = randomIp() }: { body?: unknown; cookie?: string; ip?: string } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL, "x-forwarded-for": ip });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/auth`, {
      method: handler === me ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    body: (await response.json()) as ApiBody,
    setCookie: response.headers.get("set-cookie"),
  };
}

/** `mmm_session=<token>` from a Set-Cookie header. */
function sessionCookie(setCookie: string | null): string {
  const match = /mmm_session=([^;]*)/.exec(setCookie ?? "");
  if (!match?.[1]) throw new Error(`no session cookie in: ${setCookie}`);
  return `mmm_session=${match[1]}`;
}

const uniqueEmail = () => `user-${randomBytes(4).toString("hex")}@example.com`;
const PASSWORD = "correct horse battery";

async function signUp(email = uniqueEmail(), password = PASSWORD) {
  const result = await call(signup, { body: { name: "Akshay Saini", email, password } });
  expect(result.status).toBe(201);
  return { email, password, cookie: sessionCookie(result.setCookie), result };
}

const fakeEmail = createFakeEmailAdapter();
setEmailServiceForTests(createEmailService(fakeEmail, "Make My Marriage <test@example.com>"));
afterAll(() => setEmailServiceForTests(undefined));
beforeEach(() => fakeEmail.clear());

describe("POST /api/auth/signup (API §11)", () => {
  it("creates the user, signs them in and reports hasWedding=false", async () => {
    const email = uniqueEmail();
    const { result } = await signUp(email);

    expect(result.body).toEqual({
      data: {
        user: { id: expect.any(String), name: "Akshay Saini", email },
        hasWedding: false,
      },
    });
    expect(result.setCookie).toMatch(/mmm_session=[A-Za-z0-9_-]{43};/);
    expect(result.setCookie).toMatch(/HttpOnly/i);
    expect(result.setCookie).toMatch(/SameSite=lax/i);
    expect(result.setCookie).toMatch(/Path=\//);
  });

  it("stores only an argon2id hash, never the password", async () => {
    const { email } = await signUp();
    const user = await UserModel.findOne({ email }).select("+passwordHash").lean();
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(user)).not.toContain(PASSWORD);
  });

  it("rejects a duplicate email regardless of case and spacing", async () => {
    const email = uniqueEmail();
    await signUp(email);
    const again = await call(signup, {
      body: { name: "Someone Else", email: `  ${email.toUpperCase()} `, password: PASSWORD },
    });
    expect(again).toMatchObject({ status: 409, body: { error: { code: "EMAIL_ALREADY_EXISTS" } } });
  });

  it("validates input and rejects unknown fields such as weddingId", async () => {
    const invalid = await call(signup, { body: { name: "", email: "nope", password: "short" } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error?.details).toEqual({
      name: "Enter your full name",
      email: "Enter a valid email address",
      password: "Password must be at least 8 characters",
    });

    const smuggled = await call(signup, {
      body: { name: "A", email: uniqueEmail(), password: PASSWORD, weddingId: "x" },
    });
    expect(smuggled.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rate-limits signups per IP", async () => {
    // Limits count well-formed requests (validation runs first), so reuse one valid body.
    const ip = randomIp();
    const body = { name: "A", email: uniqueEmail(), password: PASSWORD };
    expect((await call(signup, { ip, body })).status).toBe(201);
    for (let i = 1; i < 10; i += 1) expect((await call(signup, { ip, body })).status).toBe(409);
    const blocked = await call(signup, { ip, body });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error?.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/auth/login (API §12)", () => {
  it("signs in with the email in any case and sets a new session cookie", async () => {
    const { email } = await signUp();
    const result = await call(login, { body: { email: email.toUpperCase(), password: PASSWORD } });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ user: { email }, hasWedding: false });
    expect((await call(me, { cookie: sessionCookie(result.setCookie) })).status).toBe(200);
  });

  it("reports hasWedding=true for a member of an active wedding", async () => {
    const { email } = await signUp();
    const user = await UserModel.findOne({ email }).orFail();
    const wedding = await createWedding(user._id);
    await addMember(wedding._id, user._id, "ADMIN");

    const result = await call(login, { body: { email, password: PASSWORD } });
    expect(result.body.data?.hasWedding).toBe(true);
  });

  it("answers an unknown email and a wrong password identically", async () => {
    const { email } = await signUp();
    const wrongPassword = await call(login, { body: { email, password: "wrong password" } });
    const unknownEmail = await call(login, { body: { email: uniqueEmail(), password: PASSWORD } });

    const expected = {
      status: 401,
      body: { error: { code: "UNAUTHENTICATED", message: "Invalid email or password." } },
      setCookie: null,
    };
    expect(wrongPassword).toEqual(expected);
    expect(unknownEmail).toEqual(expected);
  });

  it("rate-limits attempts per IP", async () => {
    const ip = randomIp();
    const body = { email: uniqueEmail(), password: "wrong" };
    for (let i = 0; i < 10; i += 1) expect((await call(login, { ip, body })).status).toBe(401);
    expect((await call(login, { ip, body })).status).toBe(429);
  });
});

describe("GET /api/auth/me (API §14)", () => {
  it("returns the user with null membership and wedding before a wedding exists", async () => {
    const { email, cookie } = await signUp();
    expect((await call(me, { cookie })).body).toEqual({
      data: {
        user: { id: expect.any(String), name: "Akshay Saini", email },
        membership: null,
        wedding: null,
      },
    });
  });

  it("returns the role and wedding summary for a member", async () => {
    const { email, cookie } = await signUp();
    const user = await UserModel.findOne({ email }).orFail();
    const wedding = await createWedding(user._id);
    await addMember(wedding._id, user._id, "MANAGER");

    expect((await call(me, { cookie })).body.data).toMatchObject({
      membership: { role: "MANAGER" },
      wedding: {
        id: wedding._id.toString(),
        brideName: "Princi",
        groomName: "Akshay",
        weddingDate: "2027-02-14",
      },
    });
  });

  it("treats a soft-deleted wedding as no wedding", async () => {
    const { email, cookie } = await signUp();
    const user = await UserModel.findOne({ email }).orFail();
    const wedding = await createWedding(user._id, { deletedAt: new Date() });
    await addMember(wedding._id, user._id, "ADMIN");

    expect((await call(me, { cookie })).body.data).toMatchObject({
      membership: null,
      wedding: null,
    });
  });

  it("requires a session", async () => {
    expect((await call(me)).status).toBe(401);
  });
});

describe("POST /api/auth/logout (API §13)", () => {
  it("ends only the current session and clears the cookie", async () => {
    const { email, cookie } = await signUp();
    const other = sessionCookie(
      (await call(login, { body: { email, password: PASSWORD } })).setCookie,
    );

    const result = await call(logout, { cookie });
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    expect(result.setCookie).toMatch(/mmm_session=;/);
    expect(result.setCookie).toMatch(/Max-Age=0/i);

    expect((await call(me, { cookie })).status).toBe(401);
    expect((await call(me, { cookie: other })).status).toBe(200);
  });

  it("requires a session", async () => {
    expect((await call(logout)).status).toBe(401);
  });
});

describe("password reset (API §15–16)", () => {
  /** Requests a reset and returns the raw token from the emailed link. */
  async function requestReset(email: string): Promise<string> {
    const result = await call(forgotPassword, { body: { email } });
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    await vi.waitFor(() => expect(fakeEmail.sent).toHaveLength(1));
    const link = /\/reset-password\/([A-Za-z0-9_-]{43})/.exec(fakeEmail.sent[0]!.text);
    expect(link, "reset link in email").not.toBeNull();
    fakeEmail.clear();
    return link![1]!;
  }

  it("emails a single-use link to an existing account and stores only its HMAC", async () => {
    const { email } = await signUp();
    const user = await UserModel.findOne({ email }).orFail();

    const result = await call(forgotPassword, { body: { email } });
    expect(result.body).toEqual({ success: true });
    await vi.waitFor(() => expect(fakeEmail.sent).toHaveLength(1));

    const sent = fakeEmail.sent[0]!;
    expect(sent.to).toBe(email);
    expect(sent.subject).toBe("Reset your Make My Marriage password");
    expect(sent.text).toContain(`${TEST_APP_URL}/reset-password/`);
    expect(sent.text).toContain("expires in 60 minutes");

    const token = /\/reset-password\/([A-Za-z0-9_-]{43})/.exec(sent.text)![1]!;
    const stored = await PasswordResetTokenModel.findOne({ userId: user._id })
      .select("+tokenHash")
      .lean()
      .orFail();
    expect(stored.tokenHash).toBe(hashToken("password-reset", token));
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.usedAt).toBeNull();
    const minutes = (stored.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(59);
    expect(minutes).toBeLessThanOrEqual(60);
  });

  it("answers the same for an unknown email and sends nothing", async () => {
    const result = await call(forgotPassword, { body: { email: uniqueEmail() } });
    expect(result).toMatchObject({ status: 200, body: { success: true } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("still succeeds outwardly when the email provider fails", async () => {
    const { email } = await signUp();
    fakeEmail.failNext();
    expect((await call(forgotPassword, { body: { email } })).body).toEqual({ success: true });
  });

  it("sets the new password, signs out everywhere and works only once", async () => {
    const { email, cookie } = await signUp();
    const token = await requestReset(email);
    const newPassword = "a brand new password";

    const reset = await call(resetPassword, { body: { token, password: newPassword } });
    expect(reset).toMatchObject({ status: 200, body: { success: true } });

    // Existing sessions are revoked (SYSTEM_DESIGN §12).
    expect((await call(me, { cookie })).status).toBe(401);
    expect((await call(login, { body: { email, password: PASSWORD } })).status).toBe(401);
    expect((await call(login, { body: { email, password: newPassword } })).status).toBe(200);

    const reused = await call(resetPassword, { body: { token, password: "another password" } });
    expect(reused).toMatchObject({ status: 400, body: { error: { code: "INVALID_TOKEN" } } });
  });

  it("rejects an expired link with TOKEN_EXPIRED", async () => {
    const { email } = await signUp();
    const token = await requestReset(email);
    await PasswordResetTokenModel.updateOne(
      { tokenHash: hashToken("password-reset", token) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );

    const result = await call(resetPassword, { body: { token, password: "a brand new password" } });
    expect(result).toMatchObject({ status: 410, body: { error: { code: "TOKEN_EXPIRED" } } });
    expect((await call(login, { body: { email, password: PASSWORD } })).status).toBe(200);
  });

  it.each([
    ["malformed", "not-a-token"],
    ["unknown", randomBytes(32).toString("base64url")],
  ])("rejects a %s token with INVALID_TOKEN", async (_label, token) => {
    const result = await call(resetPassword, { body: { token, password: "a brand new password" } });
    expect(result).toMatchObject({ status: 400, body: { error: { code: "INVALID_TOKEN" } } });
  });

  it("validates the new password before touching the token", async () => {
    const { email } = await signUp();
    const token = await requestReset(email);

    const weak = await call(resetPassword, { body: { token, password: "short" } });
    expect(weak.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: { password: "Password must be at least 8 characters" },
    });
    // The link still works.
    const ok = await call(resetPassword, { body: { token, password: "a brand new password" } });
    expect(ok.status).toBe(200);
  });

  it("never stores raw session tokens", async () => {
    const { cookie } = await signUp();
    const raw = cookie.split("=")[1]!;
    const session = await SessionModel.findOne({ tokenHash: hashToken("session", raw) })
      .select("+tokenHash")
      .lean();
    expect(session).not.toBeNull();
    expect(await SessionModel.countDocuments({ tokenHash: raw })).toBe(0);
  });
});
