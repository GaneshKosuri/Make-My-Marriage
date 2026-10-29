import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST as acceptInvitation } from "@/app/api/member-invitations/[token]/accept/route";
import { GET as listInvitations, POST as invite } from "@/app/api/members/invitations/route";
import { DELETE as revokeInvitation } from "@/app/api/members/invitations/[invitationId]/route";
import { POST as resendInvitation } from "@/app/api/members/invitations/[invitationId]/resend/route";
import { GET as listMembers } from "@/app/api/members/route";
import {
  DELETE as removeMember,
  PATCH as changeRole,
} from "@/app/api/members/[membershipId]/route";
import { GET as publicInvitation } from "@/app/api/public/member-invitations/[token]/route";
import { MemberInvitationModel } from "@/modules/members/member-invitation.model";
import { MembershipModel } from "@/modules/members/membership.model";
import {
  createEmailService,
  createFakeEmailAdapter,
  setEmailServiceForTests,
} from "@/server/email";
import { hashToken } from "@/server/security/tokens";

import { addMember, createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/**
 * Wedding members and member invitations end to end through the route handlers
 * (PRD §9.4, API_DESIGN §21–28, DATABASE_DESIGN §23–30).
 */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}

const randomIp = () => `10.${[1, 2, 3].map(() => randomBytes(1)[0]).join(".")}`;

async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    body,
    cookie,
  }: { method?: string; params?: Record<string, string>; body?: unknown; cookie?: string } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL, "x-forwarded-for": randomIp() });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/members`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

const fakeEmail = createFakeEmailAdapter();
setEmailServiceForTests(createEmailService(fakeEmail, "Make My Marriage <test@example.com>"));
afterAll(() => setEmailServiceForTests(undefined));
beforeEach(() => fakeEmail.clear());

const uniqueEmail = () => `invitee-${randomBytes(4).toString("hex")}@example.com`;
const DAY = 24 * 60 * 60 * 1000;

/** A wedding with a signed-in Admin (Akshay) and a signed-in Manager. */
async function weddingWithAdmin() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const ownerMembership = await addMember(wedding._id, owner._id, "ADMIN");
  const admin = await signedInUser({ wedding, role: "ADMIN" });
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, owner, ownerMembership, admin, manager };
}

/** Invites through the API and reads the raw token from the email link. */
async function inviteViaApi(cookie: string, email = uniqueEmail(), role = "MANAGER") {
  const result = await call(invite, { method: "POST", cookie, body: { email, role } });
  expect(result.status).toBe(201);
  const sent = fakeEmail.sent.at(-1)!;
  const token = /\/join\/([A-Za-z0-9_-]{43})/.exec(sent.text)?.[1];
  if (!token) throw new Error("no join link in the email");
  const invitation = result.body.data as { id: string };
  return { email, token, invitationId: invitation.id, result, sent };
}

const accept = (token: string, cookie?: string) =>
  call(acceptInvitation, { method: "POST", params: { token }, cookie });

/** Test-side lookup by user (unscoped on purpose; app code always scopes by weddingId). */
const membershipOf = (userId: Types.ObjectId) =>
  MembershipModel.findOne({ userId }).setOptions({ tenantScoped: false }).lean();

describe("GET /api/members (API §21)", () => {
  it("lists every member with name, email, role and join date, for Admins and Managers", async () => {
    const { admin, manager, owner } = await weddingWithAdmin();

    const asManager = await call(listMembers, { cookie: manager.cookie });
    expect(asManager.status).toBe(200);
    const members = asManager.body.data as { user: { id: string }; role: string }[];
    expect(members).toHaveLength(3);
    expect(members[0]).toEqual({
      membershipId: expect.any(String),
      user: { id: owner._id.toString(), name: "Akshay Saini", email: owner.email },
      role: "ADMIN",
      joinedAt: expect.any(String),
    });
    expect(members.map((member) => member.user.id)).toEqual([
      owner._id.toString(),
      admin.user._id.toString(),
      manager.user._id.toString(),
    ]);

    const asAdmin = await call(listMembers, { cookie: admin.cookie });
    expect(asAdmin.body.data).toEqual(asManager.body.data);
  });

  it("is forbidden to signed-in users without a wedding", async () => {
    const outsider = await signedInUser();
    const result = await call(listMembers, { cookie: outsider.cookie });
    expect(result).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN" } } });
  });
});

describe("POST /api/members/invitations (API §22)", () => {
  it("creates a pending invitation, stores only the token's hash and emails the join link", async () => {
    const { admin, wedding } = await weddingWithAdmin();
    const email = `Rahul.${uniqueEmail()}`;
    const { token, result, sent } = await inviteViaApi(admin.cookie, `  ${email} `, "MANAGER");

    expect(result.body.data).toEqual({
      id: expect.any(String),
      email,
      role: "MANAGER",
      status: "PENDING",
      expiresAt: expect.any(String),
    });
    const expiresAt = new Date((result.body.data as { expiresAt: string }).expiresAt).getTime();
    expect(expiresAt - Date.now()).toBeGreaterThan(7 * DAY - 60_000);
    expect(expiresAt - Date.now()).toBeLessThanOrEqual(7 * DAY);

    const stored = await MemberInvitationModel.findOne({ weddingId: wedding._id })
      .select("+tokenHash")
      .lean()
      .orFail();
    expect(stored).toMatchObject({
      email,
      emailNormalized: email.toLowerCase(),
      status: "PENDING",
      invitedByUserId: admin.user._id,
    });
    expect(stored.tokenHash).toBe(hashToken("member-invite", token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(JSON.stringify(result.body)).not.toContain(token);

    expect(sent.to).toBe(email);
    expect(sent.text).toContain(`${TEST_APP_URL}/join/${token}`);
    expect(sent.subject).toContain("Akshay & Princi");
  });

  it("is Admin only", async () => {
    const { manager } = await weddingWithAdmin();
    const result = await call(invite, {
      method: "POST",
      cookie: manager.cookie,
      body: { email: uniqueEmail(), role: "MANAGER" },
    });
    expect(result).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN" } } });
    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("rejects people who are already members, whatever the case", async () => {
    const { admin, manager } = await weddingWithAdmin();
    const result = await call(invite, {
      method: "POST",
      cookie: admin.cookie,
      body: { email: manager.user.email.toUpperCase(), role: "ADMIN" },
    });
    expect(result.status).toBe(409);
    expect(result.body.error).toMatchObject({
      code: "CONFLICT",
      details: { email: "This person is already a member of your wedding." },
    });
  });

  it("rejects a second pending invitation for the same email", async () => {
    const { admin } = await weddingWithAdmin();
    const { email } = await inviteViaApi(admin.cookie);
    const again = await call(invite, {
      method: "POST",
      cookie: admin.cookie,
      body: { email, role: "ADMIN" },
    });
    expect(again.status).toBe(409);
    expect(again.body.error?.details?.email).toMatch(/already waiting/);
  });

  it("replaces an expired pending invitation with a fresh one", async () => {
    const { admin } = await weddingWithAdmin();
    const first = await inviteViaApi(admin.cookie);
    await MemberInvitationModel.updateOne(
      { _id: first.invitationId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).setOptions({ tenantScoped: false });

    const second = await inviteViaApi(admin.cookie, first.email);
    expect(second.invitationId).not.toBe(first.invitationId);
    const old = await MemberInvitationModel.findById(first.invitationId)
      .setOptions({ tenantScoped: false })
      .lean();
    expect(old?.status).toBe("REVOKED");
  });

  it("revokes the invitation when the email cannot be sent, so the admin can try again", async () => {
    const { admin, wedding } = await weddingWithAdmin();
    const email = uniqueEmail();
    fakeEmail.failNext();
    const failed = await call(invite, {
      method: "POST",
      cookie: admin.cookie,
      body: { email, role: "MANAGER" },
    });
    expect(failed).toMatchObject({
      status: 503,
      body: { error: { code: "EXTERNAL_SERVICE_ERROR" } },
    });
    const stored = await MemberInvitationModel.findOne({ weddingId: wedding._id }).lean();
    expect(stored?.status).toBe("REVOKED");

    await inviteViaApi(admin.cookie, email);
  });

  it("validates input and rejects unknown fields such as weddingId", async () => {
    const { admin } = await weddingWithAdmin();
    const invalid = await call(invite, {
      method: "POST",
      cookie: admin.cookie,
      body: { email: "nope", role: "OWNER" },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error?.details).toEqual({
      email: "Enter a valid email address",
      role: "Choose Admin or Manager",
    });

    const smuggled = await call(invite, {
      method: "POST",
      cookie: admin.cookie,
      body: { email: uniqueEmail(), role: "MANAGER", weddingId: "65abc00000000000000000a1" },
    });
    expect(smuggled.body.error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET and DELETE /api/members/invitations (API §23–24)", () => {
  it("lists this wedding's pending, unexpired invitations only", async () => {
    const { admin } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const kept = await inviteViaApi(admin.cookie);
    const expired = await inviteViaApi(admin.cookie);
    const revoked = await inviteViaApi(admin.cookie);
    await inviteViaApi(other.admin.cookie);
    await MemberInvitationModel.updateOne(
      { _id: expired.invitationId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).setOptions({ tenantScoped: false });
    await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId: revoked.invitationId },
    });

    const result = await call(listInvitations, { cookie: admin.cookie });
    expect(result.status).toBe(200);
    expect((result.body.data as { id: string }[]).map((invitation) => invitation.id)).toEqual([
      kept.invitationId,
    ]);
  });

  it("is Admin only", async () => {
    const { manager } = await weddingWithAdmin();
    const result = await call(listInvitations, { cookie: manager.cookie });
    expect(result.status).toBe(403);
  });

  it("revokes a pending invitation and its link stops working", async () => {
    const { admin } = await weddingWithAdmin();
    const { token, invitationId } = await inviteViaApi(admin.cookie);

    const result = await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId },
    });
    expect(result).toEqual({ status: 200, body: { success: true } });
    expect((await call(publicInvitation, { params: { token } })).status).toBe(404);

    const again = await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId },
    });
    expect(again.status).toBe(404);
  });

  it("answers NOT_FOUND for another wedding's invitation and leaves it alone", async () => {
    const { admin } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const { invitationId } = await inviteViaApi(other.admin.cookie);

    const result = await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId },
    });
    expect(result).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    const stored = await MemberInvitationModel.findById(invitationId)
      .setOptions({ tenantScoped: false })
      .lean();
    expect(stored?.status).toBe("PENDING");
  });
});

describe("POST /api/members/invitations/:invitationId/resend (decided 2026-10-29)", () => {
  const resend = (cookie: string, invitationId: string) =>
    call(resendInvitation, { method: "POST", cookie, params: { invitationId } });
  const tokenFrom = (text: string) => /\/join\/([A-Za-z0-9_-]{43})/.exec(text)?.[1];

  it("emails a fresh link on the same invitation; only the new link works", async () => {
    const { admin } = await weddingWithAdmin();
    const first = await inviteViaApi(admin.cookie);
    await MemberInvitationModel.updateOne(
      { _id: first.invitationId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).setOptions({ tenantScoped: false });

    const result = await resend(admin.cookie, first.invitationId);
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ id: first.invitationId, status: "PENDING" });
    expect(result.body.data).not.toHaveProperty("tokenHash");
    const fresh = tokenFrom(fakeEmail.sent.at(-1)!.text);
    expect(fresh).toBeDefined();
    expect(fresh).not.toBe(first.token);

    expect((await call(publicInvitation, { params: { token: first.token } })).status).toBe(404);
    expect((await call(publicInvitation, { params: { token: fresh! } })).status).toBe(200);
    const listed = await call(listInvitations, { cookie: admin.cookie });
    expect((listed.body.data as { id: string }[]).map((invitation) => invitation.id)).toEqual([
      first.invitationId,
    ]);
  });

  it("keeps the old link working when the email cannot be sent", async () => {
    const { admin } = await weddingWithAdmin();
    const first = await inviteViaApi(admin.cookie);
    fakeEmail.failNext();

    const failed = await resend(admin.cookie, first.invitationId);
    expect(failed).toMatchObject({
      status: 503,
      body: { error: { code: "EXTERNAL_SERVICE_ERROR" } },
    });
    expect((await call(publicInvitation, { params: { token: first.token } })).status).toBe(200);
  });

  it("is NOT_FOUND for another wedding's, revoked or accepted invitations, and Admin only", async () => {
    const { admin, manager } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const theirs = await inviteViaApi(other.admin.cookie);
    expect((await resend(admin.cookie, theirs.invitationId)).body.error?.code).toBe("NOT_FOUND");

    const revoked = await inviteViaApi(admin.cookie);
    await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId: revoked.invitationId },
    });
    expect((await resend(admin.cookie, revoked.invitationId)).status).toBe(404);

    const invitee = await signedInUser();
    const accepted = await inviteViaApi(admin.cookie, invitee.user.email);
    expect((await accept(accepted.token, invitee.cookie)).status).toBe(200);
    expect((await resend(admin.cookie, accepted.invitationId)).status).toBe(404);

    expect((await resend(manager.cookie, theirs.invitationId)).status).toBe(403);
  });
});

describe("GET /api/public/member-invitations/:token (API §25)", () => {
  it("returns only the email, role and couple", async () => {
    const { admin, wedding } = await weddingWithAdmin();
    const { token, email } = await inviteViaApi(admin.cookie, undefined, "ADMIN");

    const result = await call(publicInvitation, { params: { token } });
    expect(result).toEqual({
      status: 200,
      body: {
        data: {
          email,
          role: "ADMIN",
          wedding: { brideName: "Princi", groomName: "Akshay", weddingDate: "2027-02-14" },
          requiresLogin: true,
        },
      },
    });
    expect(JSON.stringify(result.body)).not.toContain(wedding._id.toString());
  });

  it("answers NOT_FOUND for malformed, unknown, expired and accepted links", async () => {
    const { admin } = await weddingWithAdmin();
    const expired = await inviteViaApi(admin.cookie);
    await MemberInvitationModel.updateOne(
      { _id: expired.invitationId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).setOptions({ tenantScoped: false });
    const invitee = await signedInUser();
    const accepted = await inviteViaApi(admin.cookie, invitee.user.email);
    expect((await accept(accepted.token, invitee.cookie)).status).toBe(200);

    for (const token of ["not-a-token", "A".repeat(43), expired.token, accepted.token]) {
      const result = await call(publicInvitation, { params: { token } });
      expect(result, token).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    }
  });
});

describe("POST /api/member-invitations/:token/accept (API §26)", () => {
  it("adds the invitee to the wedding with the invited role", async () => {
    const { admin, wedding } = await weddingWithAdmin();
    const invitee = await signedInUser();
    const { token, invitationId } = await inviteViaApi(
      admin.cookie,
      invitee.user.email.toUpperCase(),
      "ADMIN",
    );

    const result = await accept(token, invitee.cookie);
    expect(result).toEqual({
      status: 200,
      body: { data: { weddingId: wedding._id.toString(), role: "ADMIN" } },
    });
    expect(await membershipOf(invitee.user._id)).toMatchObject({
      weddingId: wedding._id,
      role: "ADMIN",
    });
    const stored = await MemberInvitationModel.findById(invitationId)
      .setOptions({ tenantScoped: false })
      .lean();
    expect(stored).toMatchObject({
      status: "ACCEPTED",
      acceptedByUserId: invitee.user._id,
      acceptedAt: expect.any(Date),
    });

    const members = await call(listMembers, { cookie: invitee.cookie });
    expect(members.status).toBe(200);
  });

  it("requires a signed-in user", async () => {
    const { admin } = await weddingWithAdmin();
    const { token } = await inviteViaApi(admin.cookie);
    expect((await accept(token)).status).toBe(401);
  });

  it("rejects malformed, unknown and revoked links as INVALID_TOKEN", async () => {
    const { admin } = await weddingWithAdmin();
    const invitee = await signedInUser();
    const revoked = await inviteViaApi(admin.cookie, invitee.user.email);
    await call(revokeInvitation, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { invitationId: revoked.invitationId },
    });

    for (const token of ["not-a-token", "A".repeat(43), revoked.token]) {
      const result = await accept(token, invitee.cookie);
      expect(result, token).toMatchObject({
        status: 400,
        body: { error: { code: "INVALID_TOKEN" } },
      });
    }
    expect(await membershipOf(invitee.user._id)).toBeNull();
  });

  it("rejects an expired invitation as TOKEN_EXPIRED", async () => {
    const { admin } = await weddingWithAdmin();
    const invitee = await signedInUser();
    const { token, invitationId } = await inviteViaApi(admin.cookie, invitee.user.email);
    await MemberInvitationModel.updateOne(
      { _id: invitationId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    ).setOptions({ tenantScoped: false });

    const result = await accept(token, invitee.cookie);
    expect(result).toMatchObject({ status: 410, body: { error: { code: "TOKEN_EXPIRED" } } });
  });

  it("works once: a second accept is INVITATION_ALREADY_ACCEPTED", async () => {
    const { admin } = await weddingWithAdmin();
    const invitee = await signedInUser();
    const { token } = await inviteViaApi(admin.cookie, invitee.user.email);
    expect((await accept(token, invitee.cookie)).status).toBe(200);

    const again = await accept(token, invitee.cookie);
    expect(again).toMatchObject({
      status: 409,
      body: { error: { code: "INVITATION_ALREADY_ACCEPTED" } },
    });
  });

  it("requires the signed-in email to match the invitation", async () => {
    const { admin } = await weddingWithAdmin();
    const someoneElse = await signedInUser();
    const { token } = await inviteViaApi(admin.cookie);

    const result = await accept(token, someoneElse.cookie);
    expect(result).toMatchObject({
      status: 403,
      body: { error: { code: "INVITATION_EMAIL_MISMATCH" } },
    });
    expect(await membershipOf(someoneElse.user._id)).toBeNull();
  });

  it("rejects users who already belong to a wedding (one wedding per user)", async () => {
    const { admin } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const { token, invitationId } = await inviteViaApi(admin.cookie, other.manager.user.email);

    const result = await accept(token, other.manager.cookie);
    expect(result).toMatchObject({
      status: 409,
      body: { error: { code: "ALREADY_HAS_WEDDING" } },
    });
    const stored = await MemberInvitationModel.findById(invitationId)
      .setOptions({ tenantScoped: false })
      .lean();
    expect(stored?.status).toBe("PENDING");
  });

  it("creates exactly one membership when the same invitation is accepted twice at once", async () => {
    const { admin } = await weddingWithAdmin();
    const invitee = await signedInUser();
    const { token } = await inviteViaApi(admin.cookie, invitee.user.email);

    const results = await Promise.all([
      accept(token, invitee.cookie),
      accept(token, invitee.cookie),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(
      await MembershipModel.countDocuments({ userId: invitee.user._id }).setOptions({
        tenantScoped: false,
      }),
    ).toBe(1);
  });
});

describe("PATCH /api/members/:membershipId (API §27)", () => {
  it("changes a member's role", async () => {
    const { admin, manager, wedding } = await weddingWithAdmin();
    const membership = await MembershipModel.findOne({
      weddingId: wedding._id,
      userId: manager.user._id,
    })
      .lean()
      .orFail();

    const result = await call(changeRole, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { membershipId: membership._id.toString() },
      body: { role: "ADMIN" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      membershipId: membership._id.toString(),
      user: { id: manager.user._id.toString(), email: manager.user.email },
      role: "ADMIN",
    });
    expect((await membershipOf(manager.user._id))?.role).toBe("ADMIN");
  });

  it("lets an Admin step down while another Admin remains", async () => {
    const { admin } = await weddingWithAdmin();
    const own = await membershipOf(admin.user._id);
    const result = await call(changeRole, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { membershipId: own!._id.toString() },
      body: { role: "MANAGER" },
    });
    expect(result.status).toBe(200);
    expect((await membershipOf(admin.user._id))?.role).toBe("MANAGER");
  });

  it("never leaves the wedding without an Admin (LAST_ADMIN)", async () => {
    const owner = await signedInUser();
    const wedding = await createWedding(owner.user._id);
    const membership = await addMember(wedding._id, owner.user._id, "ADMIN");

    const result = await call(changeRole, {
      method: "PATCH",
      cookie: owner.cookie,
      params: { membershipId: membership._id.toString() },
      body: { role: "MANAGER" },
    });
    expect(result).toMatchObject({ status: 409, body: { error: { code: "LAST_ADMIN" } } });
    expect((await membershipOf(owner.user._id))?.role).toBe("ADMIN");
  });

  it("answers NOT_FOUND for another wedding's member and leaves them alone", async () => {
    const { admin } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const theirs = await membershipOf(other.manager.user._id);

    const result = await call(changeRole, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { membershipId: theirs!._id.toString() },
      body: { role: "ADMIN" },
    });
    expect(result).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    expect((await membershipOf(other.manager.user._id))?.role).toBe("MANAGER");
  });

  it("is Admin only and validates the role", async () => {
    const { admin, manager } = await weddingWithAdmin();
    const theirs = await membershipOf(admin.user._id);
    const asManager = await call(changeRole, {
      method: "PATCH",
      cookie: manager.cookie,
      params: { membershipId: theirs!._id.toString() },
      body: { role: "MANAGER" },
    });
    expect(asManager.status).toBe(403);

    const invalid = await call(changeRole, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { membershipId: theirs!._id.toString() },
      body: { role: "OWNER" },
    });
    expect(invalid.status).toBe(400);
  });
});

describe("DELETE /api/members/:membershipId (API §28)", () => {
  it("removes a member, whose access ends immediately", async () => {
    const { admin, manager } = await weddingWithAdmin();
    const theirs = await membershipOf(manager.user._id);

    const result = await call(removeMember, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { membershipId: theirs!._id.toString() },
    });
    expect(result).toEqual({ status: 200, body: { success: true } });
    expect(await membershipOf(manager.user._id)).toBeNull();

    const afterwards = await call(listMembers, { cookie: manager.cookie });
    expect(afterwards).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN" } } });
  });

  it("never removes the last Admin (LAST_ADMIN)", async () => {
    const owner = await signedInUser();
    const wedding = await createWedding(owner.user._id);
    const membership = await addMember(wedding._id, owner.user._id, "ADMIN");

    const result = await call(removeMember, {
      method: "DELETE",
      cookie: owner.cookie,
      params: { membershipId: membership._id.toString() },
    });
    expect(result).toMatchObject({ status: 409, body: { error: { code: "LAST_ADMIN" } } });
    expect(await membershipOf(owner.user._id)).not.toBeNull();
  });

  it("answers NOT_FOUND for another wedding's member and leaves them alone", async () => {
    const { admin } = await weddingWithAdmin();
    const other = await weddingWithAdmin();
    const theirs = await membershipOf(other.manager.user._id);

    const result = await call(removeMember, {
      method: "DELETE",
      cookie: admin.cookie,
      params: { membershipId: theirs!._id.toString() },
    });
    expect(result.status).toBe(404);
    expect(await membershipOf(other.manager.user._id)).not.toBeNull();
  });

  it("is Admin only", async () => {
    const { admin, manager } = await weddingWithAdmin();
    const theirs = await membershipOf(admin.user._id);
    const result = await call(removeMember, {
      method: "DELETE",
      cookie: manager.cookie,
      params: { membershipId: theirs!._id.toString() },
    });
    expect(result.status).toBe(403);
    expect(await membershipOf(admin.user._id)).not.toBeNull();
  });
});
