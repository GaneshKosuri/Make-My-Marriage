import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DELETE as removeMember } from "@/app/api/members/[membershipId]/route";
import {
  DELETE as deleteTask,
  GET as getTask,
  PATCH as updateTask,
} from "@/app/api/tasks/[taskId]/route";
import { GET as listTasks, POST as createTask } from "@/app/api/tasks/route";
import { EventModel } from "@/modules/events/event.model";
import { TaskModel } from "@/modules/tasks/task.model";
import { taskRepository } from "@/modules/tasks/task.repository";

import { addMember, createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** Tasks end to end through the route handlers (PRD §9.6, API_DESIGN §34–38). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type TaskBody = Record<string, unknown> & {
  id: string;
  version: number;
  completedAt: string | null;
};

const YEAR = new Date().getUTCFullYear() + 1;
// Midnight 15 January in India.
const DUE = `${YEAR}-01-14T18:30:00.000Z`;

async function call(
  handler: Handler,
  {
    method = "GET",
    params = {},
    query = "",
    body,
    cookie,
  }: {
    method?: string;
    params?: Record<string, string>;
    query?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/tasks${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/**
 * A wedding with a signed-in Manager (the caller), another member (Princi) and
 * an event. Tasks are open to every member.
 */
async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const ownerMembership = await addMember(wedding._id, owner._id, "ADMIN");
  const princiUser = await createUser({ name: "Princi Rawat" });
  const princi = await addMember(wedding._id, princiUser._id, "MANAGER");
  const caller = await signedInUser({ wedding, role: "MANAGER" });
  const callerMembership = await membershipOf(wedding._id, caller.user._id);
  const event = await EventModel.create({
    weddingId: wedding._id,
    name: "Haldi",
    startsAt: new Date(`${YEAR}-02-13T03:30:00Z`),
  });
  const admin = await signedInUser({ wedding, role: "ADMIN" });
  return {
    wedding,
    cookie: caller.cookie,
    adminCookie: admin.cookie,
    me: callerMembership,
    owner: ownerMembership._id.toString(),
    princi: princi._id.toString(),
    event: event._id.toString(),
  };
}

async function membershipOf(weddingId: Types.ObjectId, userId: Types.ObjectId) {
  const { MembershipModel } = await import("@/modules/members/membership.model");
  const membership = await MembershipModel.findOne({ weddingId, userId }).lean().orFail();
  return membership._id.toString();
}

async function create(cookie: string, body: Record<string, unknown>) {
  const result = await call(createTask, { method: "POST", body, cookie });
  expect(result.status).toBe(201);
  return result.body.data as TaskBody;
}

const patch = (cookie: string, taskId: string, body: unknown) =>
  call(updateTask, { method: "PATCH", params: { taskId }, body, cookie });

// Test-only read straight from the collection, across weddings.
const stored = (id: string) => TaskModel.findById(id).setOptions({ tenantScoped: false }).lean();

const titles = (body: ApiBody) => (body.data as TaskBody[]).map((task) => task.title);

describe("POST /api/tasks", () => {
  it("creates a task with an assignee and event, showing their names but no email", async () => {
    const { cookie, princi, event } = await setup();
    const task = await create(cookie, {
      title: "  Order Haldi flowers ",
      description: "Marigold, 40 strings",
      assignedMembershipId: princi,
      eventId: event,
      dueDate: DUE,
      priority: "HIGH",
    });

    expect(task).toEqual({
      id: expect.any(String),
      title: "Order Haldi flowers",
      description: "Marigold, 40 strings",
      priority: "HIGH",
      status: "TODO",
      dueDate: DUE,
      completedAt: null,
      assignedMembershipId: princi,
      assignee: { membershipId: princi, name: "Princi Rawat", role: "MANAGER" },
      event: { id: event, name: "Haldi", archivedAt: null },
      version: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(JSON.stringify(task)).not.toContain("@");
  });

  it("needs only a title: medium priority, to do, nothing linked", async () => {
    const { cookie } = await setup();
    expect(await create(cookie, { title: "Book the pandit" })).toMatchObject({
      priority: "MEDIUM",
      status: "TODO",
      description: null,
      dueDate: null,
      assignedMembershipId: null,
      assignee: null,
      event: null,
    });
  });

  it("sets completedAt when a task is created already completed", async () => {
    const { cookie } = await setup();
    const task = await create(cookie, { title: "Choose the date", status: "COMPLETED" });
    expect(task.completedAt).toEqual(expect.any(String));
  });

  it.each([
    [{ title: " " }, "title"],
    [{ title: "x".repeat(201) }, "title"],
    [{ title: "Flowers", dueDate: `${YEAR}-01-15` }, "dueDate"],
    [{ title: "Flowers", priority: "URGENT" }, "priority"],
    [{ title: "Flowers", eventId: "abc" }, "eventId"],
  ])("rejects invalid input (%#: %s)", async (body, field) => {
    const { cookie } = await setup();
    const result = await call(createTask, { method: "POST", body, cookie });
    expect(result.status).toBe(400);
    expect(result.body.error?.details).toHaveProperty(field);
  });

  it.each(["completedAt", "weddingId"])("rejects a client-supplied %s", async (field) => {
    const { cookie } = await setup();
    const result = await call(createTask, {
      method: "POST",
      body: {
        title: "Flowers",
        [field]: field === "weddingId" ? randomBytes(12).toString("hex") : DUE,
      },
      cookie,
    });
    expect(result.status).toBe(400);
  });

  it("refuses an assignee or event from another wedding, or an archived event", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const archived = await EventModel.create({
      weddingId: other.wedding._id,
      name: "Roka",
      startsAt: new Date(),
      archivedAt: new Date(),
    });

    for (const [body, field] of [
      [{ assignedMembershipId: other.princi }, "assignedMembershipId"],
      [{ eventId: other.event }, "eventId"],
    ] as const) {
      const result = await call(createTask, {
        method: "POST",
        body: { title: "Flowers", ...body },
        cookie,
      });
      expect(result).toMatchObject({ status: 400, body: { error: { code: "VALIDATION_ERROR" } } });
      expect(result.body.error?.details).toHaveProperty(field);
    }
    const ownArchived = await call(createTask, {
      method: "POST",
      body: { title: "Flowers", eventId: archived._id.toString() },
      cookie: other.cookie,
    });
    expect(ownArchived.body.error?.details).toEqual({
      eventId: "Choose an event of this wedding that is not archived",
    });
    expect(await TaskModel.countDocuments({ weddingId: other.wedding._id })).toBe(0);
  });
});

describe("GET /api/tasks", () => {
  it("lists newest first with page metadata, never other weddings' tasks", async () => {
    const { cookie } = await setup();
    for (const title of ["First", "Second", "Third"]) await create(cookie, { title });
    const other = await setup();
    await create(other.cookie, { title: "Not ours" });

    const page1 = await call(listTasks, { cookie, query: "?limit=2" });
    expect(page1.status).toBe(200);
    expect(titles(page1.body)).toEqual(["Third", "Second"]);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const page2 = await call(listTasks, { cookie, query: "?limit=2&page=2" });
    expect(titles(page2.body)).toEqual(["First"]);
  });

  it("combines filters with AND, including none for general and unassigned tasks", async () => {
    const { cookie, me, princi, event } = await setup();
    await create(cookie, { title: "Mine, Haldi", assignedMembershipId: me, eventId: event });
    await create(cookie, {
      title: "Mine, general, high",
      assignedMembershipId: me,
      priority: "HIGH",
    });
    await create(cookie, {
      title: "Princi's",
      assignedMembershipId: princi,
      status: "IN_PROGRESS",
    });
    await create(cookie, { title: "Nobody's" });

    const list = async (query: string) => titles((await call(listTasks, { cookie, query })).body);
    expect(await list("?mine=true")).toEqual(["Mine, general, high", "Mine, Haldi"]);
    expect(await list("?mine=true&eventId=none")).toEqual(["Mine, general, high"]);
    expect(await list(`?eventId=${event}`)).toEqual(["Mine, Haldi"]);
    expect(await list("?assignedMembershipId=none")).toEqual(["Nobody's"]);
    expect(await list(`?assignedMembershipId=${princi}`)).toEqual(["Princi's"]);
    expect(await list("?status=IN_PROGRESS")).toEqual(["Princi's"]);
    expect(await list("?priority=HIGH&mine=true")).toEqual(["Mine, general, high"]);
    expect(await list("?mine=false")).toHaveLength(4);
    // A different explicit assignee and mine=true match nothing.
    expect(await list(`?mine=true&assignedMembershipId=${princi}`)).toEqual([]);
    expect(await list("?mine=true&assignedMembershipId=none")).toEqual([]);
  });

  it.each(["?status=DONE", "?mine=yes", "?eventId=abc", "?limit=101", "?weddingId=x"])(
    "rejects an invalid query (%s)",
    async (query) => {
      const { cookie } = await setup();
      expect((await call(listTasks, { cookie, query })).status).toBe(400);
    },
  );
});

describe("PATCH /api/tasks/:taskId", () => {
  it("sets completedAt on completion, keeps it on metadata edits and clears it on reopening", async () => {
    const { cookie } = await setup();
    const task = await create(cookie, { title: "Book the mehendi artist" });

    const done = await patch(cookie, task.id, { status: "COMPLETED", version: 0 });
    const completedAt = (done.body.data as TaskBody).completedAt;
    expect(completedAt).toEqual(expect.any(String));

    const renamed = await patch(cookie, task.id, { title: "Book Neha for mehendi" });
    expect(renamed.body.data).toMatchObject({ completedAt, status: "COMPLETED", version: 2 });
    const stillDone = await patch(cookie, task.id, { status: "COMPLETED" });
    expect((stillDone.body.data as TaskBody).completedAt).toBe(completedAt);

    const reopened = await patch(cookie, task.id, { status: "IN_PROGRESS" });
    expect(reopened.body.data).toMatchObject({ completedAt: null, status: "IN_PROGRESS" });
  });

  it("changes only the fields sent; blank or null clears optional ones", async () => {
    const { cookie, princi, event } = await setup();
    const task = await create(cookie, {
      title: "Flowers",
      description: "Marigold",
      assignedMembershipId: princi,
      eventId: event,
      dueDate: DUE,
    });

    const result = await patch(cookie, task.id, {
      description: "",
      eventId: null,
      dueDate: null,
      version: 0,
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      title: "Flowers",
      description: null,
      event: null,
      dueDate: null,
      assignedMembershipId: princi,
      version: 1,
    });
  });

  it("refuses a stale version with CONFLICT", async () => {
    const { cookie } = await setup();
    const task = await create(cookie, { title: "Flowers" });
    await patch(cookie, task.id, { priority: "HIGH", version: 0 });

    const stale = await patch(cookie, task.id, { priority: "LOW", version: 0 });
    expect(stale).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });
    expect((await stored(task.id))?.priority).toBe("HIGH");
  });

  it("refuses a write when the task changed between the read and the update", async () => {
    const { wedding, cookie } = await setup();
    const task = await create(cookie, { title: "Flowers" });
    await patch(cookie, task.id, { priority: "HIGH" });
    expect(
      await taskRepository.updateVersioned(wedding._id.toString(), task.id, 0, { priority: "LOW" }),
    ).toBeNull();
  });

  it("keeps an archived event or a former member, but won't link new ones", async () => {
    const { wedding, cookie, adminCookie, princi, event } = await setup();
    const task = await create(cookie, {
      title: "Flowers",
      assignedMembershipId: princi,
      eventId: event,
    });
    await EventModel.updateOne({ _id: event, weddingId: wedding._id }, { archivedAt: new Date() });
    const removed = await call(removeMember, {
      method: "DELETE",
      params: { membershipId: princi },
      cookie: adminCookie,
    });
    expect(removed.status).toBe(200);

    // The task still points at both: "Former member" and an archived event.
    const kept = await call(getTask, { params: { taskId: task.id }, cookie });
    expect(kept.body.data).toMatchObject({
      assignedMembershipId: princi,
      assignee: null,
      event: { id: event, archivedAt: expect.any(String) },
    });
    // Other edits keep them; sending them unchanged is fine too.
    const edited = await patch(cookie, task.id, {
      title: "Order flowers",
      assignedMembershipId: princi,
      eventId: event,
    });
    expect(edited.status).toBe(200);

    // A fresh task can't be linked to them.
    const fresh = await call(createTask, {
      method: "POST",
      body: { title: "Garlands", assignedMembershipId: princi, eventId: event },
      cookie,
    });
    expect(Object.keys(fresh.body.error?.details ?? {}).sort()).toEqual([
      "assignedMembershipId",
      "eventId",
    ]);
    // Clearing them works.
    const cleared = await patch(cookie, task.id, { assignedMembershipId: null, eventId: null });
    expect(cleared.body.data).toMatchObject({ assignedMembershipId: null, event: null });
  });

  it.each([{}, { version: 1 }, { completedAt: DUE }, { title: "x", weddingId: "y" }])(
    "rejects a body with nothing to change or fields callers may not send (%#)",
    async (body) => {
      const { cookie } = await setup();
      const task = await create(cookie, { title: "Flowers" });
      expect((await patch(cookie, task.id, body)).status).toBe(400);
    },
  );
});

describe("DELETE /api/tasks/:taskId", () => {
  it("hard-deletes the task", async () => {
    const { cookie } = await setup();
    const task = await create(cookie, { title: "Flowers" });

    expect(
      await call(deleteTask, { method: "DELETE", params: { taskId: task.id }, cookie }),
    ).toEqual({ status: 200, body: { success: true } });
    expect(await stored(task.id)).toBeNull();
    expect(
      (await call(deleteTask, { method: "DELETE", params: { taskId: task.id }, cookie })).status,
    ).toBe(404);
  });
});

describe("another wedding's tasks (SYSTEM_DESIGN §91)", () => {
  it("are NOT_FOUND for get, update and delete, and stay unchanged", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const task = await create(other.cookie, { title: "Their flowers" });
    const params = { taskId: task.id };

    for (const result of [
      await call(getTask, { params, cookie }),
      await patch(cookie, task.id, { title: "Hijacked", version: 0 }),
      await call(deleteTask, { method: "DELETE", params, cookie }),
    ]) {
      expect(result).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    }
    expect(await stored(task.id)).toMatchObject({ title: "Their flowers", __v: 0 });
  });
});
