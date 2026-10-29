import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getDashboard } from "@/app/api/dashboard/route";
import { GET as getWedding } from "@/app/api/wedding/route";
import { daysUntil } from "@/lib/dates";
import { EventModel } from "@/modules/events/event.model";
import { ExpenseModel } from "@/modules/expenses/expense.model";
import { GuestModel } from "@/modules/guests/guest.model";
import { MembershipModel } from "@/modules/members/membership.model";
import { TaskModel } from "@/modules/tasks/task.model";
import { VendorModel } from "@/modules/vendors/vendor.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";

import { addMember, createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL } from "../setup/test-env";

/** GET /api/dashboard (API_DESIGN §20, PRD §9.3) and GET /api/wedding (API_DESIGN §18). */

type Handler = (request: NextRequest) => Promise<Response>;
interface ApiBody {
  data?: Record<string, unknown>;
  error?: { code: string };
}

async function call(handler: Handler, path: string, cookie?: string) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  const response = await handler(new NextRequest(`${TEST_APP_URL}${path}`, { headers }));
  return { status: response.status, body: (await response.json()) as ApiBody };
}

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (days: number) => new Date(Date.now() + days * DAY);

/** A wedding with an Admin and a signed-in Manager. */
async function weddingWithMember() {
  const admin = await createUser({ name: "Akshay Saini" });
  const wedding = await createWedding(admin._id);
  await addMember(wedding._id, admin._id, "ADMIN");
  const member = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, member };
}

async function addEvent(weddingId: Types.ObjectId, name: string, startsAt: Date, extra = {}) {
  return EventModel.create({ weddingId, name, startsAt, ...extra });
}

async function addGuest(weddingId: Types.ObjectId, extra = {}) {
  return GuestModel.create({
    weddingId,
    name: `Guest ${randomBytes(3).toString("hex")}`,
    invitationToken: randomBytes(32).toString("base64url"),
    ...extra,
  });
}

describe("GET /api/dashboard", () => {
  it("returns zeros and the countdown for a new wedding", async () => {
    const { wedding, member } = await weddingWithMember();
    const result = await call(getDashboard, "/api/dashboard", member.cookie);

    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      countdown: {
        weddingDate: wedding.weddingDate,
        daysRemaining: daysUntil(wedding.weddingDate, wedding.timeZone),
      },
      summary: {
        events: 0,
        tasks: { total: 0, completed: 0 },
        guests: 0,
        rsvps: { pending: 0, attending: 0, notAttending: 0, peopleAttending: 0 },
        invitationsSent: 0,
        members: 2,
        totalExpensePaise: 0,
        vendors: 0,
      },
      upcomingEvents: [],
      upcomingTasks: [],
    });
  });

  it("counts this wedding's data only and lists what comes next", async () => {
    const { wedding, member } = await weddingWithMember();
    const other = await createWedding((await createUser())._id);
    const weddingId = wedding._id;

    // Events: archived and finished ones are left out of the upcoming list.
    await addEvent(weddingId, "Roka", fromNow(-30));
    await addEvent(weddingId, "Engagement", fromNow(-2), { archivedAt: new Date() });
    const ongoing = await addEvent(weddingId, "Haldi", fromNow(-0.1), { endsAt: fromNow(0.1) });
    const mehendi = await addEvent(weddingId, "Mehendi", fromNow(5), {
      endsAt: fromNow(5.2),
      venueName: "Pine View Lawn",
      dressCode: "Pastel & yellow",
    });
    await addEvent(other._id, "Other wedding's Sangeet", fromNow(1));

    // Tasks: incomplete ones by nearest due date, undated last.
    const assignee = member.user;
    const membership = await MembershipModel.findOne({ weddingId, userId: assignee._id })
      .lean()
      .orFail();
    await TaskModel.create([
      { weddingId, title: "Book the pandit", status: "COMPLETED", completedAt: new Date() },
      { weddingId, title: "Choose Sangeet songs" },
      { weddingId, title: "Confirm Haldi flowers", dueDate: fromNow(10), priority: "LOW" },
      {
        weddingId,
        title: "Finalise photographer",
        dueDate: fromNow(-3),
        priority: "HIGH",
        assignedMembershipId: membership._id,
        eventId: mehendi._id,
      },
      { weddingId: other._id, title: "Other wedding's task", dueDate: fromNow(-10) },
    ]);

    // Guests: a family of four is one guest entry but four people.
    await addGuest(weddingId, { maxGuests: 4, rsvpStatus: "ATTENDING", attendingCount: 4 });
    await addGuest(weddingId, { maxGuests: 2, rsvpStatus: "ATTENDING", attendingCount: 2 });
    await addGuest(weddingId, { rsvpStatus: "NOT_ATTENDING", attendingCount: 0 });
    await addGuest(weddingId, { invitationSentAt: new Date() });
    await addGuest(weddingId);
    await addGuest(other._id, { rsvpStatus: "ATTENDING", attendingCount: 9 });

    const expense = (amountPaise: number, weddingRef = weddingId) => ({
      weddingId: weddingRef,
      title: "Advance",
      amountPaise,
      expenseDate: new Date(),
      category: "VENUE" as const,
      createdByMembershipId: membership._id,
    });
    await ExpenseModel.create([expense(100_000_00), expense(24_500_00), expense(999, other._id)]);

    await VendorModel.create([
      { weddingId, name: "Lens & Light", category: "PHOTOGRAPHER" },
      { weddingId, name: "Old caterer", category: "CATERER", archivedAt: new Date() },
      { weddingId: other._id, name: "Other vendor", category: "VENUE" },
    ]);

    const result = await call(getDashboard, "/api/dashboard", member.cookie);
    expect(result.status).toBe(200);
    const data = result.body.data as {
      summary: Record<string, unknown>;
      upcomingEvents: { id: string; name: string; venueName: string; dressCode: string }[];
      upcomingTasks: {
        title: string;
        assignee: { name: string; role: string } | null;
        event: { name: string } | null;
      }[];
    };

    expect(data.summary).toEqual({
      events: 3,
      tasks: { total: 4, completed: 1 },
      guests: 5,
      rsvps: { pending: 2, attending: 2, notAttending: 1, peopleAttending: 6 },
      invitationsSent: 1,
      members: 2,
      totalExpensePaise: 124_500_00,
      vendors: 1,
    });
    expect(data.upcomingEvents.map((event) => event.name)).toEqual(["Haldi", "Mehendi"]);
    expect(data.upcomingEvents[0]!.id).toBe(ongoing._id.toString());
    expect(data.upcomingEvents[1]).toMatchObject({
      venueName: "Pine View Lawn",
      dressCode: "Pastel & yellow",
    });
    expect(data.upcomingTasks.map((task) => task.title)).toEqual([
      "Finalise photographer",
      "Confirm Haldi flowers",
      "Choose Sangeet songs",
    ]);
    expect(data.upcomingTasks[0]).toMatchObject({
      assignee: { name: assignee.name, role: "MANAGER" },
      event: { name: "Mehendi" },
    });
    expect(data.upcomingTasks[2]).toMatchObject({ assignee: null, event: null });
    expect(JSON.stringify(result.body)).not.toContain("Other wedding");
  });

  it("requires a signed-in Wedding Member", async () => {
    expect((await call(getDashboard, "/api/dashboard")).status).toBe(401);
    const { cookie } = await signedInUser();
    const result = await call(getDashboard, "/api/dashboard", cookie);
    expect(result.status).toBe(403);
    expect(result.body.error?.code).toBe("FORBIDDEN");
  });
});

describe("GET /api/wedding", () => {
  it("returns the member's own wedding without the gallery token", async () => {
    const { wedding, member } = await weddingWithMember();
    await WeddingModel.updateOne(
      { _id: wedding._id },
      { $set: { "location.city": "Dehradun", "location.state": "Uttarakhand" } },
    );
    await createWedding((await createUser())._id);

    const result = await call(getWedding, "/api/wedding", member.cookie);
    expect(result.status).toBe(200);
    expect(result.body.data).toEqual({
      id: wedding._id.toString(),
      brideName: "Princi",
      groomName: "Akshay",
      title: null,
      description: null,
      weddingDate: "2027-02-14",
      timeZone: "Asia/Kolkata",
      location: {
        formattedAddress: null,
        city: "Dehradun",
        state: "Uttarakhand",
        country: null,
        latitude: null,
        longitude: null,
        googlePlaceId: null,
      },
      website: {
        slug: wedding.website.slug,
        theme: "CLASSIC",
        isPublished: false,
        welcomeMessage: null,
      },
      gallery: { isEnabled: false, guestUploadsEnabled: false },
      livestream: { youtubeUrl: null, isEnabled: false },
    });
    expect(JSON.stringify(result.body)).not.toContain(wedding.gallery.token);
  });

  it("requires a signed-in Wedding Member", async () => {
    expect((await call(getWedding, "/api/wedding")).status).toBe(401);
    const { cookie } = await signedInUser();
    expect((await call(getWedding, "/api/wedding", cookie)).status).toBe(403);
  });
});
