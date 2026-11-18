import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as dashboard } from "@/app/api/dashboard/route";
import {
  DELETE as deleteExpense,
  GET as getExpense,
  PATCH as updateExpense,
} from "@/app/api/expenses/[expenseId]/route";
import { GET as listExpenses, POST as createExpense } from "@/app/api/expenses/route";
import { GET as expenseSummary } from "@/app/api/expenses/summary/route";
import { EventModel } from "@/modules/events/event.model";
import { ExpenseModel } from "@/modules/expenses/expense.model";
import { MembershipModel } from "@/modules/members/membership.model";
import { VendorModel } from "@/modules/vendors/vendor.model";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** The expense tracker end to end through the route handlers (PRD §9.15, API_DESIGN §53–58). */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
type ExpenseBody = Record<string, unknown> & {
  id: string;
  title: string;
  version: number;
  event: { id: string; name: string; archivedAt: string | null } | null;
  vendor: { id: string; name: string; archivedAt: string | null } | null;
};

const YEAR = new Date().getUTCFullYear() + 1;

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
    new NextRequest(`${TEST_APP_URL}/api/expenses${query}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/** A wedding with a signed-in Manager, an active and an archived event, an active and an archived vendor. */
async function setup() {
  const owner = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(owner._id);
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  const [sangeet, roka] = await EventModel.create([
    { weddingId: wedding._id, name: "Sangeet", startsAt: new Date(`${YEAR}-02-13T13:30:00Z`) },
    {
      weddingId: wedding._id,
      name: "Roka",
      startsAt: new Date(`${YEAR}-01-01T12:00:00Z`),
      archivedAt: new Date(),
    },
  ]);
  const [pixel, oldFlorist] = await VendorModel.create([
    { weddingId: wedding._id, name: "Pixel Photography", category: "PHOTOGRAPHER" },
    { weddingId: wedding._id, name: "Old Florist", category: "FLORIST", archivedAt: new Date() },
  ]);
  const membership = await MembershipModel.findOne({ userId: manager.user._id })
    .setOptions({ tenantScoped: false })
    .lean()
    .orFail();
  return {
    wedding,
    cookie: manager.cookie,
    membershipId: membership._id.toString(),
    sangeet: sangeet!._id.toString(),
    archivedEvent: roka!._id.toString(),
    pixel: pixel!._id.toString(),
    archivedVendor: oldFlorist!._id.toString(),
  };
}

async function create(cookie: string, body: Record<string, unknown>) {
  const result = await call(createExpense, { method: "POST", body, cookie });
  expect(result.status).toBe(201);
  return result.body.data as ExpenseBody;
}

const advance = (extra: Record<string, unknown> = {}) => ({
  title: "Photographer advance",
  amountPaise: 5_000_000,
  expenseDate: "2026-09-01",
  category: "PHOTOGRAPHY",
  ...extra,
});

const patch = (cookie: string, expenseId: string, body: unknown) =>
  call(updateExpense, { method: "PATCH", params: { expenseId }, body, cookie });

const titles = (body: ApiBody) => (body.data as ExpenseBody[]).map((expense) => expense.title);

describe("POST /api/expenses", () => {
  it("records an expense with its event and vendor, and who added it", async () => {
    const { cookie, sangeet, pixel, membershipId } = await setup();
    const expense = await create(cookie, {
      ...advance({ title: "  Photographer advance " }),
      eventId: sangeet,
      vendorId: pixel,
      notes: "Advance payment",
    });

    expect(expense).toEqual({
      id: expect.any(String),
      title: "Photographer advance",
      amountPaise: 5_000_000,
      currency: "INR",
      expenseDate: "2026-09-01",
      category: "PHOTOGRAPHY",
      event: { id: sangeet, name: "Sangeet", startsAt: expect.any(String), archivedAt: null },
      vendor: { id: pixel, name: "Pixel Photography", category: "PHOTOGRAPHER", archivedAt: null },
      notes: "Advance payment",
      version: 0,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    const stored = await ExpenseModel.findById(expense.id)
      .setOptions({ tenantScoped: false })
      .lean();
    expect(stored?.createdByMembershipId.toString()).toBe(membershipId);
    // A calendar day at UTC midnight: never shifted by a time zone.
    expect(stored?.expenseDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("needs no event or vendor", async () => {
    const { cookie } = await setup();
    expect(await create(cookie, advance({ category: "CLOTHING", title: "Lehenga" }))).toMatchObject(
      { event: null, vendor: null, notes: null },
    );
  });

  it.each([
    [{ amountPaise: 0 }, "amountPaise"],
    [{ amountPaise: 12.5 }, "amountPaise"],
    [{ amountPaise: -100 }, "amountPaise"],
    [{ expenseDate: "01/09/2026" }, "expenseDate"],
    [{ expenseDate: "2026-02-30" }, "expenseDate"],
    [{ category: "MISCELLANEOUS" }, "category"],
    [{ currency: "USD" }, "currency"],
    [{ title: " " }, "title"],
  ])("refuses an invalid expense (%o)", async (extra, field) => {
    const { cookie } = await setup();
    const result = await call(createExpense, { method: "POST", body: advance(extra), cookie });
    expect(result.status).toBe(400);
    expect(result.body.error?.details).toHaveProperty(field);
  });

  it("refuses fields only the server sets, including weddingId", async () => {
    const { cookie, wedding, membershipId } = await setup();
    for (const extra of [
      { weddingId: wedding._id.toString() },
      { createdByMembershipId: membershipId },
    ]) {
      const result = await call(createExpense, { method: "POST", body: advance(extra), cookie });
      expect(result.status).toBe(400);
    }
  });

  it("links only active events and vendors of this wedding", async () => {
    const { cookie, archivedEvent, archivedVendor } = await setup();
    const other = await setup();
    for (const [extra, field] of [
      [{ eventId: archivedEvent }, "eventId"],
      [{ eventId: other.sangeet }, "eventId"],
      [{ vendorId: archivedVendor }, "vendorId"],
      [{ vendorId: other.pixel }, "vendorId"],
    ] as const) {
      const result = await call(createExpense, { method: "POST", body: advance(extra), cookie });
      expect(result.status).toBe(400);
      expect(result.body.error?.details).toHaveProperty(field);
    }
  });
});

describe("GET /api/expenses", () => {
  it("lists newest first and filters by category, event, vendor and dates", async () => {
    const { cookie, sangeet, pixel } = await setup();
    await create(
      cookie,
      advance({ title: "Venue advance", category: "VENUE", expenseDate: "2026-08-15" }),
    );
    await create(cookie, advance({ title: "Photographer advance", vendorId: pixel }));
    await create(
      cookie,
      advance({
        title: "Sangeet DJ",
        category: "ENTERTAINMENT",
        expenseDate: "2026-11-20",
        eventId: sangeet,
      }),
    );

    const all = await call(listExpenses, { cookie });
    expect(titles(all.body)).toEqual(["Sangeet DJ", "Photographer advance", "Venue advance"]);
    expect(all.body.pagination).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });

    const filtered = async (query: string) =>
      titles((await call(listExpenses, { query, cookie })).body);
    expect(await filtered("?category=VENUE")).toEqual(["Venue advance"]);
    expect(await filtered(`?eventId=${sangeet}`)).toEqual(["Sangeet DJ"]);
    expect(await filtered(`?vendorId=${pixel}`)).toEqual(["Photographer advance"]);
    // Both ends included.
    expect(await filtered("?from=2026-09-01&to=2026-11-20")).toEqual([
      "Sangeet DJ",
      "Photographer advance",
    ]);
    expect(await filtered("?to=2026-08-31")).toEqual(["Venue advance"]);
  });

  it("never lists another wedding's expenses", async () => {
    const mine = await setup();
    const theirs = await setup();
    await create(theirs.cookie, advance());
    expect((await call(listExpenses, { cookie: mine.cookie })).body.data).toEqual([]);
  });

  it.each([
    "?from=2026-12-01&to=2026-11-01",
    "?from=yesterday",
    "?category=MISCELLANEOUS",
    "?weddingId=abc",
    "?vendorId=xyz",
  ])("refuses an invalid query (%s)", async (query) => {
    const { cookie } = await setup();
    expect((await call(listExpenses, { query, cookie })).status).toBe(400);
  });
});

describe("GET /api/expenses/summary", () => {
  it("totals by category, largest first, with no budget figures", async () => {
    const { cookie } = await setup();
    const other = await setup();
    await create(cookie, advance({ category: "VENUE", amountPaise: 60_000_000 }));
    await create(cookie, advance({ category: "CATERING", amountPaise: 42_000_000 }));
    await create(cookie, advance({ category: "VENUE", amountPaise: 1_250_050 }));
    await create(other.cookie, advance({ amountPaise: 99_999 }));

    const summary = await call(expenseSummary, { cookie });
    expect(summary.body.data).toEqual({
      totalExpensePaise: 103_250_050,
      currency: "INR",
      byCategory: [
        { category: "VENUE", amountPaise: 61_250_050 },
        { category: "CATERING", amountPaise: 42_000_000 },
      ],
    });

    const empty = await setup();
    expect((await call(expenseSummary, { cookie: empty.cookie })).body.data).toEqual({
      totalExpensePaise: 0,
      currency: "INR",
      byCategory: [],
    });
  });

  it("matches the dashboard total", async () => {
    const { cookie } = await setup();
    await create(cookie, advance({ amountPaise: 1_234_550 }));
    const response = await dashboard(
      new NextRequest(`${TEST_APP_URL}/api/dashboard`, { headers: { cookie } }),
    );
    expect(await response.json()).toMatchObject({
      data: { summary: { totalExpensePaise: 1_234_550 } },
    });
  });
});

describe("GET /api/expenses/:id", () => {
  it("returns this wedding's expense and 404 for another wedding's", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const expense = await create(cookie, advance());
    expect(
      (await call(getExpense, { params: { expenseId: expense.id }, cookie })).body.data,
    ).toEqual(expense);
    const elsewhere = await call(getExpense, {
      params: { expenseId: expense.id },
      cookie: other.cookie,
    });
    expect(elsewhere).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
  });

  it("keeps showing a vendor and event archived after the expense was recorded", async () => {
    const { cookie, sangeet, pixel } = await setup();
    const expense = await create(cookie, advance({ eventId: sangeet, vendorId: pixel }));
    await VendorModel.updateOne({ _id: pixel }, { archivedAt: new Date() }).setOptions({
      tenantScoped: false,
    });
    await EventModel.updateOne({ _id: sangeet }, { archivedAt: new Date() }).setOptions({
      tenantScoped: false,
    });

    const fetched = (await call(getExpense, { params: { expenseId: expense.id }, cookie })).body
      .data as ExpenseBody;
    expect(fetched.vendor).toMatchObject({ id: pixel, archivedAt: expect.any(String) });
    expect(fetched.event).toMatchObject({ id: sangeet, archivedAt: expect.any(String) });
    // …and it can still be edited without unlinking them.
    expect((await patch(cookie, expense.id, { notes: "Paid", version: 0 })).status).toBe(200);
  });
});

describe("PATCH /api/expenses/:id", () => {
  it("changes only what is sent, unlinks with null and bumps the version", async () => {
    const { cookie, sangeet, pixel } = await setup();
    const expense = await create(
      cookie,
      advance({ eventId: sangeet, vendorId: pixel, notes: "x" }),
    );

    const result = await patch(cookie, expense.id, {
      amountPaise: 6_000_000,
      expenseDate: "2026-09-02",
      vendorId: null,
      notes: "",
      version: 0,
    });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({
      title: "Photographer advance",
      amountPaise: 6_000_000,
      expenseDate: "2026-09-02",
      event: { id: sangeet },
      vendor: null,
      notes: null,
      version: 1,
    });
  });

  it("refuses a stale version, a newly linked archived vendor, and another wedding's expense", async () => {
    const { cookie, archivedVendor } = await setup();
    const other = await setup();
    const expense = await create(cookie, advance());
    expect((await patch(cookie, expense.id, { title: "First", version: 0 })).status).toBe(200);

    const stale = await patch(cookie, expense.id, { title: "Second", version: 0 });
    expect(stale).toMatchObject({ status: 409, body: { error: { code: "CONFLICT" } } });

    const archived = await patch(cookie, expense.id, { vendorId: archivedVendor });
    expect(archived.status).toBe(400);
    expect(archived.body.error?.details).toHaveProperty("vendorId");

    expect((await patch(other.cookie, expense.id, { title: "Mine" })).status).toBe(404);
  });

  it.each([{}, { version: 0 }, { createdByMembershipId: "a".repeat(24) }, { amountPaise: 0 }])(
    "refuses an invalid change (%o)",
    async (body) => {
      const { cookie } = await setup();
      const expense = await create(cookie, advance());
      expect((await patch(cookie, expense.id, body)).status).toBe(400);
    },
  );
});

describe("DELETE /api/expenses/:id", () => {
  it("deletes for good, and answers 404 for another wedding's or a deleted one", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const expense = await create(cookie, advance());

    const elsewhere = await call(deleteExpense, {
      method: "DELETE",
      params: { expenseId: expense.id },
      cookie: other.cookie,
    });
    expect(elsewhere.status).toBe(404);

    const deleted = await call(deleteExpense, {
      method: "DELETE",
      params: { expenseId: expense.id },
      cookie,
    });
    expect(deleted).toEqual({ status: 200, body: { success: true } });
    expect(
      await ExpenseModel.findById(expense.id).setOptions({ tenantScoped: false }).lean(),
    ).toBeNull();
    const again = await call(deleteExpense, {
      method: "DELETE",
      params: { expenseId: expense.id },
      cookie,
    });
    expect(again.status).toBe(404);
  });
});
