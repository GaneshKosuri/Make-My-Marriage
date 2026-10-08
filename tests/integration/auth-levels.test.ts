import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { GET as me } from "@/app/api/auth/me/route";
import {
  GET as processEmailJobs,
  POST as processEmailJobsPost,
} from "@/app/api/internal/jobs/email/route";
import { DELETE as removeMember } from "@/app/api/members/[membershipId]/route";
import { GET as listMemberInvitations } from "@/app/api/members/invitations/route";
import { GET as listTasks } from "@/app/api/tasks/route";

import { createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL, TEST_CRON_SECRET } from "../setup/test-env";

/**
 * Real auth levels through the identity adapter (sessions, users, memberships,
 * weddings in MongoDB), wired by the composition root exactly as in Next.js.
 */

type Handler = (request: NextRequest, context: { params: Promise<unknown> }) => Promise<Response>;

async function call(
  handler: Handler,
  {
    method = "GET",
    cookie,
    headers = {},
    params = {},
  }: {
    method?: string;
    cookie?: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
  } = {},
) {
  const all = new Headers(headers);
  if (cookie) all.set("cookie", cookie);
  if (method !== "GET") all.set("origin", TEST_APP_URL);
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/x`, { method, headers: all }),
    {
      params: Promise.resolve(params),
    },
  );
  return {
    status: response.status,
    body: (await response.json()) as { data?: unknown; error?: { code: string } },
  };
}

let admin: Awaited<ReturnType<typeof signedInUser>>;
let manager: Awaited<ReturnType<typeof signedInUser>>;
let noWedding: Awaited<ReturnType<typeof signedInUser>>;
let deletedWeddingMember: Awaited<ReturnType<typeof signedInUser>>;

beforeAll(async () => {
  const founder = await signedInUser();
  const wedding = await createWedding(founder.user._id);
  admin = await signedInUser({ wedding, role: "ADMIN" });
  manager = await signedInUser({ wedding, role: "MANAGER" });
  noWedding = await signedInUser();
  const deleted = await createWedding(founder.user._id, { deletedAt: new Date() });
  deletedWeddingMember = await signedInUser({ wedding: deleted, role: "ADMIN" });
});

describe("member routes", () => {
  it("401 without a session", async () => {
    expect(await call(listTasks)).toMatchObject({
      status: 401,
      body: { error: { code: "UNAUTHENTICATED" } },
    });
  });

  it("403 for a signed-in user with no wedding", async () => {
    expect(await call(listTasks, { cookie: noWedding.cookie })).toMatchObject({
      status: 403,
      body: { error: { code: "FORBIDDEN" } },
    });
  });

  it("403 when the member's wedding is soft-deleted", async () => {
    expect((await call(listTasks, { cookie: deletedWeddingMember.cookie })).status).toBe(403);
  });

  it("passes members through to the (stubbed) handler", async () => {
    expect(await call(listTasks, { cookie: manager.cookie })).toMatchObject({
      status: 501,
      body: { error: { code: "NOT_IMPLEMENTED" } },
    });
  });
});

describe("admin routes (API_DESIGN §97)", () => {
  it("Managers cannot manage Wedding Members", async () => {
    expect((await call(listMemberInvitations, { cookie: manager.cookie })).status).toBe(403);
    const removal = await call(removeMember, {
      method: "DELETE",
      cookie: manager.cookie,
      params: { membershipId: admin.user._id.toString() },
    });
    expect(removal).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN" } } });
  });

  it("Admins pass", async () => {
    expect((await call(listMemberInvitations, { cookie: admin.cookie })).status).toBe(501);
  });
});

describe("user routes", () => {
  it("accept signed-in users without a wedding", async () => {
    expect((await call(me, { cookie: noWedding.cookie })).status).toBe(501);
    expect((await call(me)).status).toBe(401);
  });
});

describe("internal cron route (binding decision 9)", () => {
  it("requires the cron secret on GET and POST and reports an empty run until Phase 3", async () => {
    expect((await call(processEmailJobs)).status).toBe(401);
    const authorization = `Bearer ${TEST_CRON_SECRET}`;
    for (const [handler, method] of [
      [processEmailJobs, "GET"],
      [processEmailJobsPost, "POST"],
    ] as const) {
      expect(await call(handler, { method, headers: { authorization } })).toEqual({
        status: 200,
        body: { data: { claimed: 0, sent: 0, failed: 0 } },
      });
    }
  });
});
