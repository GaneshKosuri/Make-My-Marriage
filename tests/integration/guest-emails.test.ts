import { randomBytes } from "node:crypto";

import type { Types } from "mongoose";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as retryFailed } from "@/app/api/email-batches/[batchId]/retry-failed/route";
import { GET as batchStatus } from "@/app/api/email-batches/[batchId]/route";
import { POST as sendInvitationsInBulk } from "@/app/api/guests/actions/send-invitations/route";
import { POST as sendRemindersInBulk } from "@/app/api/guests/actions/send-reminders/route";
import { DELETE as deleteGuest } from "@/app/api/guests/[guestId]/route";
import { POST as sendInvitation } from "@/app/api/guests/[guestId]/send-invitation/route";
import { POST as sendReminder } from "@/app/api/guests/[guestId]/send-reminder/route";
import { GET as rsvpSummary } from "@/app/api/guests/rsvp-summary/route";
import { POST as createGuest } from "@/app/api/guests/route";
import { GET as runWorker } from "@/app/api/internal/jobs/email/route";
import { EmailJobModel } from "@/modules/email-jobs/email-job.model";
import { configureGuestEmails, emailJobWorker } from "@/modules/email-jobs";
import { getGuestEmailPort } from "@/modules/email-jobs/guest-email.port";
import { GuestModel } from "@/modules/guests/guest.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import {
  createEmailService,
  createFakeEmailAdapter,
  EmailQuotaError,
  setEmailServiceForTests,
} from "@/server/email";
import { connectToDatabase } from "@/server/db/connection";
import { logger } from "@/server/logging/logger";

import { createUser, createWedding, signedInUser } from "../setup/factories";
import { TEST_APP_URL, TEST_CRON_SECRET } from "../setup/test-env";

/**
 * Guest invitation and reminder emails, one at a time and in bulk, with the
 * email worker and batch progress (PRD §9.12–9.13; API_DESIGN §46–49, §85–87).
 */

type Handler = (request: NextRequest, context?: { params: Promise<unknown> }) => Promise<Response>;
interface ApiBody {
  data?: unknown;
  success?: boolean;
  error?: { code: string; message: string; details?: Record<string, string> };
}
interface Batch {
  batchId: string;
  jobsCreated: number;
}

const fakeEmail = createFakeEmailAdapter();
setEmailServiceForTests(createEmailService(fakeEmail, "Make My Marriage <test@example.com>"));
afterAll(() => setEmailServiceForTests(undefined));
// Mongoose builds indexes in the background; the one-active-job rule needs its unique index.
beforeAll(async () => {
  await connectToDatabase();
  await EmailJobModel.init();
});

async function call(
  handler: Handler,
  {
    method = "POST",
    params = {},
    body,
    cookie,
    headers: extra = {},
  }: {
    method?: string;
    params?: Record<string, string>;
    body?: unknown;
    cookie?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers({ origin: TEST_APP_URL, ...extra });
  if (cookie) headers.set("cookie", cookie);
  if (body !== undefined) headers.set("content-type", "application/json");
  const response = await handler(
    new NextRequest(`${TEST_APP_URL}/api/test`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
  return { status: response.status, body: (await response.json()) as ApiBody };
}

/** A wedding (Akshay & Princi, titled differently) with a signed-in Manager. */
async function setup() {
  const owner = await createUser();
  const wedding = await createWedding(owner._id);
  await WeddingModel.updateOne({ _id: wedding._id }, { title: "Our celebration" });
  const manager = await signedInUser({ wedding, role: "MANAGER" });
  return { wedding, cookie: manager.cookie };
}

async function addGuest(cookie: string, body: Record<string, unknown>) {
  const result = await call(createGuest, { body, cookie });
  expect(result.status).toBe(201);
  return (result.body.data as { id: string }).id;
}

const stored = (guestId: string) =>
  GuestModel.findById(guestId)
    .select("+invitationToken")
    .setOptions({ tenantScoped: false })
    .lean()
    .orFail();

const jobsOf = (batchId: string) =>
  EmailJobModel.find({ batchId }).setOptions({ tenantScoped: false }).lean();

const sentTo = (address: string) => fakeEmail.sent.filter((message) => message.to === address);

/** As if their invitation had been emailed earlier. */
const markInvited = (guestId: string) =>
  GuestModel.updateOne({ _id: guestId }, { invitationSentAt: new Date() }).setOptions({
    tenantScoped: false,
  });

/** A job of `type` for the guest, in its own batch, not due for an hour unless `extra` says so. */
async function existingJob(
  weddingId: Types.ObjectId,
  guestId: string,
  type: "GUEST_INVITATION" | "RSVP_REMINDER",
  extra: { status?: "SENT" | "FAILED"; attempts?: number; nextAttemptAt?: Date } = {},
) {
  const batchId = randomBytes(16).toString("base64url");
  const job = await EmailJobModel.create({
    weddingId,
    type,
    guestId,
    recipientEmail: "someone@example.com",
    batchId,
    idempotencyKey: `${type}:${guestId}:${batchId}`,
    nextAttemptAt: new Date(Date.now() + 60 * 60_000),
    ...extra,
  });
  return { batchId, jobId: job._id };
}

const activeJobsFor = (guestId: string) =>
  EmailJobModel.countDocuments({ guestId, status: { $in: ["PENDING", "PROCESSING"] } }).setOptions({
    tenantScoped: false,
  });

/** Lets background sends started by `after()` finish. */
const settled = (batchId: string) =>
  vi.waitFor(
    async () => {
      const jobs = await jobsOf(batchId);
      expect(jobs.every((job) => job.status !== "PENDING" && job.status !== "PROCESSING")).toBe(
        true,
      );
    },
    { timeout: 10_000 },
  );

beforeEach(() => fakeEmail.clear());

describe("POST /api/guests/:id/send-invitation", () => {
  it("emails the guest's own link with the couple's names and records when", async () => {
    const { cookie } = await setup();
    const guestId = await addGuest(cookie, { name: "Rajesh Sharma", email: "rajesh@example.com" });

    const result = await call(sendInvitation, { params: { guestId }, cookie });
    expect(result).toEqual({ status: 200, body: { success: true } });

    const [email] = sentTo("rajesh@example.com");
    const guest = await stored(guestId);
    expect(email?.subject).toBe("You're invited: Akshay & Princi's wedding");
    expect(email?.text).toContain("Dear Rajesh Sharma,");
    expect(email?.text).toContain("14 February 2027");
    expect(email?.text).toContain(`${TEST_APP_URL}/invite/${guest.invitationToken}`);
    expect(guest.invitationSentAt).toBeInstanceOf(Date);
    // Delivery is the server's business: an organiser's open edit form isn't made stale.
    expect(guest.__v).toBe(0);
  });

  it("needs an email address, and answers 404 for another wedding's guest", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const noEmail = await addGuest(cookie, { name: "Meera" });
    const theirs = await addGuest(other.cookie, { name: "Theirs", email: "t@example.com" });

    const missing = await call(sendInvitation, { params: { guestId: noEmail }, cookie });
    expect(missing).toMatchObject({
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", details: { email: expect.any(String) } } },
    });
    expect((await call(sendInvitation, { params: { guestId: theirs }, cookie })).status).toBe(404);
    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("explains when the email provider has reached its sending limit", async () => {
    const { cookie } = await setup();
    const guestId = await addGuest(cookie, { name: "Asha", email: "asha@example.com" });
    fakeEmail.failNext(new EmailQuotaError("550 5.4.5 Daily user sending limit exceeded"));

    const result = await call(sendInvitation, { params: { guestId }, cookie });
    expect(result).toMatchObject({
      status: 503,
      body: {
        error: { code: "EXTERNAL_SERVICE_ERROR", message: expect.stringContaining("limit") },
      },
    });
    expect((await stored(guestId)).invitationSentAt).toBeNull();
  });
});

describe("POST /api/guests/:id/send-reminder", () => {
  it("reminds a guest still awaiting a reply and counts it", async () => {
    const { cookie } = await setup();
    const guestId = await addGuest(cookie, { name: "Asha", email: "asha@example.com" });
    await markInvited(guestId);

    expect((await call(sendReminder, { params: { guestId }, cookie })).status).toBe(200);
    expect((await call(sendReminder, { params: { guestId }, cookie })).status).toBe(200);
    expect(sentTo("asha@example.com")[0]?.subject).toBe(
      "Reminder: please RSVP for Akshay & Princi's wedding",
    );
    expect(await stored(guestId)).toMatchObject({
      reminderCount: 2,
      lastReminderSentAt: expect.any(Date),
    });
  });

  it("won't remind a guest whose invitation was never emailed (decided 2026-11-12)", async () => {
    const { cookie } = await setup();
    const guestId = await addGuest(cookie, { name: "Asha", email: "asha@example.com" });

    const result = await call(sendReminder, { params: { guestId }, cookie });
    expect(result).toMatchObject({
      status: 400,
      body: { error: { details: { invitationSentAt: expect.any(String) } } },
    });
    expect(fakeEmail.sent).toHaveLength(0);
  });

  it("won't remind a guest who already replied", async () => {
    const { cookie } = await setup();
    const guestId = await addGuest(cookie, { name: "Asha", email: "asha@example.com" });
    await GuestModel.updateOne(
      { _id: guestId },
      { rsvpStatus: "NOT_ATTENDING", attendingCount: 0 },
    ).setOptions({ tenantScoped: false });

    const result = await call(sendReminder, { params: { guestId }, cookie });
    expect(result).toMatchObject({
      status: 400,
      body: { error: { details: { rsvpStatus: expect.any(String) } } },
    });
    expect(fakeEmail.sent).toHaveLength(0);
  });
});

describe("bulk invitations and reminders", () => {
  it("queues one email per guest not yet invited, sends them after the response, and reports progress", async () => {
    const { cookie } = await setup();
    const a = await addGuest(cookie, { name: "A", email: "a@example.com" });
    const b = await addGuest(cookie, { name: "B", email: "b@example.com" });
    await addGuest(cookie, { name: "No email" });
    const alreadySent = await addGuest(cookie, { name: "C", email: "c@example.com" });
    await GuestModel.updateOne({ _id: alreadySent }, { invitationSentAt: new Date() }).setOptions({
      tenantScoped: false,
    });

    const summary = await call(rsvpSummary, { method: "GET", cookie });
    // Reminders only for guests already emailed their invitation (C).
    expect(summary.body.data).toMatchObject({ invitationsToEmail: 2, remindersToEmail: 1 });

    const result = await call(sendInvitationsInBulk, { body: { scope: "ALL_UNSENT" }, cookie });
    expect(result.status).toBe(200);
    const { batchId, jobsCreated } = result.body.data as Batch;
    expect(jobsCreated).toBe(2);
    expect(batchId).toMatch(/^[A-Za-z0-9_-]{22}$/);

    await settled(batchId);
    expect(sentTo("a@example.com")).toHaveLength(1);
    expect(sentTo("b@example.com")).toHaveLength(1);
    expect(sentTo("c@example.com")).toHaveLength(0);
    expect((await stored(a)).invitationSentAt).toBeInstanceOf(Date);
    expect((await stored(b)).invitationSentAt).toBeInstanceOf(Date);

    const status = await call(batchStatus, { method: "GET", params: { batchId }, cookie });
    expect(status.body.data).toEqual({
      batchId,
      total: 2,
      pending: 0,
      processing: 0,
      sent: 2,
      failed: 0,
      cancelled: 0,
      completed: true,
    });
  });

  it("doesn't queue a guest twice while their email is still waiting", async () => {
    const { cookie, wedding } = await setup();
    const guestId = await addGuest(cookie, { name: "A", email: "a@example.com" });
    // A job already waiting (e.g. the provider's limit was reached).
    await EmailJobModel.create({
      weddingId: wedding._id,
      type: "GUEST_INVITATION",
      guestId,
      recipientEmail: "a@example.com",
      batchId: "waitingbatchwaitingbat",
      idempotencyKey: `GUEST_INVITATION:${guestId}:earlier`,
      nextAttemptAt: new Date(Date.now() + 60 * 60_000),
    });

    const result = await call(sendInvitationsInBulk, {
      body: { scope: "SELECTED", guestIds: [guestId] },
      cookie,
    });
    expect((result.body.data as Batch).jobsCreated).toBe(0);
  });

  it("reminds only chosen guests still awaiting a reply, and answers 404 for another wedding's batch", async () => {
    const { cookie } = await setup();
    const other = await setup();
    const pending = await addGuest(cookie, { name: "Pending", email: "p@example.com" });
    const replied = await addGuest(cookie, { name: "Replied", email: "r@example.com" });
    await markInvited(pending);
    await markInvited(replied);
    await GuestModel.updateOne(
      { _id: replied },
      { rsvpStatus: "ATTENDING", attendingCount: 1 },
    ).setOptions({ tenantScoped: false });
    const theirs = await addGuest(other.cookie, { name: "Theirs", email: "t@example.com" });

    const result = await call(sendRemindersInBulk, {
      body: { scope: "SELECTED", guestIds: [pending, replied, theirs] },
      cookie,
    });
    const { batchId, jobsCreated } = result.body.data as Batch;
    expect(jobsCreated).toBe(1);
    await settled(batchId);
    expect(sentTo("p@example.com")[0]?.subject).toContain("Reminder");
    expect(sentTo("r@example.com")).toHaveLength(0);
    expect(sentTo("t@example.com")).toHaveLength(0);
    expect((await stored(pending)).reminderCount).toBe(1);

    const elsewhere = await call(batchStatus, {
      method: "GET",
      params: { batchId },
      cookie: other.cookie,
    });
    expect(elsewhere.status).toBe(404);
  });

  it("reminds only guests already emailed their invitation, in the count and the send (decided 2026-11-12)", async () => {
    const { cookie } = await setup();
    const emailed = await addGuest(cookie, { name: "Emailed", email: "e@example.com" });
    await addGuest(cookie, { name: "WhatsApp only", email: "w@example.com" });
    await markInvited(emailed);

    const summary = await call(rsvpSummary, { method: "GET", cookie });
    expect(summary.body.data).toMatchObject({ remindersToEmail: 1 });

    const result = await call(sendRemindersInBulk, { body: { scope: "ALL_PENDING_RSVP" }, cookie });
    const { batchId, jobsCreated } = result.body.data as Batch;
    expect(jobsCreated).toBe(1);
    await settled(batchId);
    expect(sentTo("e@example.com")).toHaveLength(1);
    expect(sentTo("w@example.com")).toHaveLength(0);
  });

  it("leaves guests whose email is already queued out of the counts to email", async () => {
    const { cookie, wedding } = await setup();
    const waiting = await addGuest(cookie, { name: "Waiting", email: "w@example.com" });
    await addGuest(cookie, { name: "Not yet", email: "n@example.com" });
    const invited = await addGuest(cookie, { name: "Invited", email: "i@example.com" });
    await markInvited(invited);

    const before = await call(rsvpSummary, { method: "GET", cookie });
    expect(before.body.data).toMatchObject({ invitationsToEmail: 2, remindersToEmail: 1 });

    // e.g. waiting out the provider's daily limit.
    await existingJob(wedding._id, waiting, "GUEST_INVITATION");
    await existingJob(wedding._id, invited, "RSVP_REMINDER");
    const after = await call(rsvpSummary, { method: "GET", cookie });
    expect(after.body.data).toMatchObject({ invitationsToEmail: 1, remindersToEmail: 0 });
  });

  it("queues each guest once when two bulk sends run at the same time", async () => {
    const { cookie, wedding } = await setup();
    const guests = await Promise.all(
      ["a", "b", "c"].map((name) => addGuest(cookie, { name, email: `${name}-race@example.com` })),
    );

    const results = await Promise.all([
      call(sendInvitationsInBulk, { body: { scope: "ALL_UNSENT" }, cookie }),
      call(sendInvitationsInBulk, { body: { scope: "ALL_UNSENT" }, cookie }),
    ]);
    const batches = results.map((result) => result.body.data as Batch);
    expect(batches[0]!.jobsCreated + batches[1]!.jobsCreated).toBe(3);
    for (const batch of batches.filter((b) => b.jobsCreated > 0)) await settled(batch.batchId);
    for (const name of ["a", "b", "c"]) expect(sentTo(`${name}-race@example.com`)).toHaveLength(1);
    const jobs = await EmailJobModel.countDocuments({
      weddingId: wedding._id,
      guestId: { $in: guests },
    }).setOptions({ tenantScoped: false });
    expect(jobs).toBe(3);
  });

  it("refuses a second active email of the same kind for a guest at the database", async () => {
    const { cookie, wedding } = await setup();
    const guestId = await addGuest(cookie, { name: "A", email: "a@example.com" });
    await existingJob(wedding._id, guestId, "GUEST_INVITATION");

    await expect(existingJob(wedding._id, guestId, "GUEST_INVITATION")).rejects.toMatchObject({
      code: 11000,
    });
    // Other kinds, and finished jobs, don't count.
    await existingJob(wedding._id, guestId, "RSVP_REMINDER");
    await existingJob(wedding._id, guestId, "GUEST_INVITATION", { status: "SENT" });
    expect(await activeJobsFor(guestId)).toBe(2);
  });

  it("'Try again' doesn't queue a guest whose email was queued or sent again since", async () => {
    const { cookie, wedding } = await setup();
    const queuedAgain = await addGuest(cookie, { name: "Queued again", email: "q@example.com" });
    const sentSince = await addGuest(cookie, { name: "Sent since", email: "s@example.com" });
    const failed = { status: "FAILED" as const, attempts: 3, nextAttemptAt: new Date() };
    const { batchId } = await existingJob(wedding._id, queuedAgain, "GUEST_INVITATION", failed);
    await EmailJobModel.create({
      weddingId: wedding._id,
      type: "GUEST_INVITATION",
      guestId: sentSince,
      recipientEmail: "s@example.com",
      batchId,
      idempotencyKey: `GUEST_INVITATION:${sentSince}:${batchId}`,
      ...failed,
    });
    await existingJob(wedding._id, queuedAgain, "GUEST_INVITATION");
    await existingJob(wedding._id, sentSince, "GUEST_INVITATION", { status: "SENT" });

    const retried = await call(retryFailed, { params: { batchId }, cookie });
    expect(retried.body.data).toMatchObject({ failed: 0, pending: 0, cancelled: 2 });
    expect(await activeJobsFor(queuedAgain)).toBe(1);
    expect(await activeJobsFor(sentSince)).toBe(0);
    expect(fakeEmail.sent).toHaveLength(0);
  });

  it.each([
    [sendInvitationsInBulk, { scope: "ALL_PENDING_RSVP" }],
    [sendInvitationsInBulk, { scope: "SELECTED" }],
    [sendInvitationsInBulk, { scope: "SELECTED", guestIds: [] }],
    [sendInvitationsInBulk, { scope: "ALL_UNSENT", guestIds: ["a".repeat(24)] }],
    [sendRemindersInBulk, { scope: "ALL_UNSENT" }],
    [sendRemindersInBulk, { scope: "ALL_PENDING_RSVP", weddingId: "a".repeat(24) }],
  ])("rejects an invalid request (%#)", async (handler, body) => {
    const { cookie } = await setup();
    expect((await call(handler, { body, cookie })).status).toBe(400);
  });
});

describe("email worker (API_DESIGN §87)", () => {
  async function queued(status: Record<string, unknown> = {}) {
    const { cookie, wedding } = await setup();
    const email = `guest-${randomBytes(4).toString("hex")}@example.com`;
    const guestId = await addGuest(cookie, { name: "Asha", email });
    const batchId = randomBytes(16).toString("base64url");
    const job = await EmailJobModel.create({
      weddingId: wedding._id,
      type: "GUEST_INVITATION",
      guestId,
      recipientEmail: email,
      batchId,
      idempotencyKey: `GUEST_INVITATION:${guestId}:${batchId}`,
      ...status,
    });
    return { cookie, guestId, batchId, jobId: job._id, email };
  }
  const job = (jobId: unknown) =>
    EmailJobModel.findById(jobId).setOptions({ tenantScoped: false }).lean().orFail();

  it("needs the cron secret", async () => {
    const denied = await call(runWorker, { method: "GET" });
    expect(denied.status).toBe(401);
    const allowed = await call(runWorker, {
      method: "GET",
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    expect(allowed.status).toBe(200);
  });

  it("retries a failed send after 5 then 30 minutes, then marks it FAILED", async () => {
    const { jobId, email, batchId, cookie } = await queued();
    for (const [attempt, waitMinutes] of [
      [1, 5],
      [2, 30],
    ] as const) {
      fakeEmail.failNext();
      const before = Date.now();
      await emailJobWorker.processDueJobs({ requestId: "test" });
      const after = await job(jobId);
      expect(after).toMatchObject({ status: "PENDING", attempts: attempt });
      expect(after.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + waitMinutes * 60_000);
      await EmailJobModel.updateOne({ _id: jobId }, { nextAttemptAt: new Date() }).setOptions({
        tenantScoped: false,
      });
    }
    fakeEmail.failNext();
    await emailJobWorker.processDueJobs({ requestId: "test" });
    expect(await job(jobId)).toMatchObject({ status: "FAILED", attempts: 3 });
    expect(sentTo(email)).toHaveLength(0);

    // "Retry failed" starts it again with fresh attempts.
    const retried = await call(retryFailed, { params: { batchId }, cookie });
    expect(retried.status).toBe(200);
    await settled(batchId);
    expect(await job(jobId)).toMatchObject({ status: "SENT" });
    expect(sentTo(email)).toHaveLength(1);
  });

  it("waits an hour without spending an attempt when the provider's limit is reached", async () => {
    const { jobId } = await queued();
    fakeEmail.failNext(new EmailQuotaError("550 5.4.5 Daily user sending limit exceeded"));
    const before = Date.now();
    await emailJobWorker.processDueJobs({ requestId: "test" });
    const after = await job(jobId);
    expect(after).toMatchObject({ status: "PENDING", attempts: 0 });
    expect(after.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 60_000);
  });

  it("cancels an email that no longer applies instead of sending it", async () => {
    const { jobId, guestId, email } = await queued({ type: "RSVP_REMINDER" });
    await GuestModel.updateOne(
      { _id: guestId },
      { rsvpStatus: "ATTENDING", attendingCount: 1 },
    ).setOptions({ tenantScoped: false });
    await emailJobWorker.processDueJobs({ requestId: "test" });
    expect(await job(jobId)).toMatchObject({ status: "CANCELLED" });
    expect(sentTo(email)).toHaveLength(0);
  });

  it("counts an email as sent when recording it on the guest fails afterwards", async () => {
    const { jobId, guestId, email } = await queued();
    const port = getGuestEmailPort();
    configureGuestEmails({
      compose: (queuedJob) => port.compose(queuedJob),
      delivered: (queuedJob, at) =>
        queuedJob.guestId.toString() === guestId
          ? Promise.reject(new Error("Transient database error"))
          : port.delivered(queuedJob, at),
    });
    const warn = vi.spyOn(logger, "warn");
    try {
      const result = await emailJobWorker.processDueJobs({ requestId: "test" });
      expect(result.failed).toBe(0);
      expect(result.sent).toBeGreaterThanOrEqual(1);
      expect(await job(jobId)).toMatchObject({ status: "SENT", attempts: 1 });
      expect(sentTo(email)).toHaveLength(1);
      expect(warn).toHaveBeenCalledWith(
        "Email sent but not recorded on the guest",
        expect.anything(),
      );
      expect(warn).not.toHaveBeenCalledWith("Email job attempt failed", expect.anything());
    } finally {
      warn.mockRestore();
      configureGuestEmails(port);
    }
  });

  it("puts a job interrupted mid-send back in the queue", async () => {
    const { jobId, email } = await queued({
      status: "PROCESSING",
      lockId: "crashed-run",
      lockedAt: new Date(Date.now() - 20 * 60_000),
    });
    await emailJobWorker.processDueJobs({ requestId: "test" });
    expect(await job(jobId)).toMatchObject({ status: "SENT", attempts: 2 });
    expect(sentTo(email)).toHaveLength(1);
  });

  it("deleting a guest cancels their waiting email", async () => {
    const { jobId, guestId, cookie } = await queued({
      nextAttemptAt: new Date(Date.now() + 60 * 60_000),
    });
    expect(
      (await call(deleteGuest, { method: "DELETE", params: { guestId }, cookie })).status,
    ).toBe(200);
    expect(await job(jobId)).toMatchObject({ status: "CANCELLED" });
  });
});
