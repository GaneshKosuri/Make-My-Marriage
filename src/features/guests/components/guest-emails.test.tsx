// @vitest-environment jsdom
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailBatchStatusDto } from "@/modules/email-jobs/email-job.types";
import type { GuestDto } from "@/modules/guests/guest.types";

import { useRsvpSummary } from "../api";
import { GUESTS } from "../guests-content";
import { BulkEmailButton, BulkEmailProgress } from "./bulk-email";
import { EmailInvitation } from "./email-invitation";

const ID = "6aeb2fe70d805e865a620aa1";
const BATCH = "b".repeat(22);

const guest = (extra: Partial<GuestDto> = {}): GuestDto => ({
  id: ID,
  name: "Rajesh Sharma",
  email: "raj@example.com",
  phone: null,
  maxGuests: 4,
  invitedEvents: [],
  notes: null,
  rsvpStatus: "PENDING",
  attendingCount: null,
  rsvpUpdatedAt: null,
  invitationSentAt: null,
  lastReminderSentAt: null,
  reminderCount: 0,
  version: 0,
  createdAt: "2026-11-12T00:00:00.000Z",
  updatedAt: "2026-11-12T00:00:00.000Z",
  ...extra,
});

const batch = (extra: Partial<EmailBatchStatusDto> = {}): EmailBatchStatusDto => ({
  batchId: BATCH,
  total: 3,
  pending: 0,
  processing: 0,
  sent: 3,
  failed: 0,
  cancelled: 0,
  completed: true,
  ...extra,
});

type Reply = { status: number; body: unknown };
let replies: Record<string, (body: unknown) => Reply>;
const calls: { method: string; url: string; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, url, body });
  const handler = replies[`${method} ${url}`];
  const result = handler
    ? handler(body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

let client: QueryClient;
function renderWithClient(element: ReactElement) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

/** A mounted guest query, to count the refetches a progress check causes. */
function SummaryProbe() {
  useRsvpSummary();
  return null;
}
const summaryFetches = () => calls.filter((call) => call.url === "/api/guests/rsvp-summary").length;
const checkBatchNow = () => act(() => client.refetchQueries({ queryKey: ["email-batch", BATCH] }));

beforeEach(() => {
  replies = {};
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<EmailInvitation />", () => {
  it("emails the invitation now and says so", async () => {
    replies[`POST /api/guests/${ID}/send-invitation`] = () => ({
      status: 200,
      body: { success: true },
    });
    renderWithClient(
      <EmailInvitation guest={guest()} timeZone="Asia/Kolkata" onAddEmail={vi.fn()} />,
    );

    expect(screen.getByText(GUESTS.email.notSent)).toBeInTheDocument();
    // No reminder before the invitation has gone out.
    expect(screen.queryByRole("button", { name: GUESTS.email.remind })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: GUESTS.email.send }));
    expect(await screen.findByText(GUESTS.email.done.invitation)).toBeInTheDocument();
  });

  it("offers a resend and a reminder once invited, with when they went out", () => {
    renderWithClient(
      <EmailInvitation
        guest={guest({
          invitationSentAt: "2026-11-10T10:30:00.000Z",
          lastReminderSentAt: "2026-11-11T04:30:00.000Z",
          reminderCount: 2,
        })}
        timeZone="Asia/Kolkata"
        onAddEmail={vi.fn()}
      />,
    );
    expect(screen.getByText(/Invitation emailed 10 Nov 2026, 4:00 PM\./)).toBeInTheDocument();
    expect(
      screen.getByText("2 reminders sent, the last 11 Nov 2026, 10:00 AM."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GUESTS.email.resend })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GUESTS.email.remind })).toBeInTheDocument();
  });

  it("shows the server's explanation when the email account is at its limit", async () => {
    replies[`POST /api/guests/${ID}/send-invitation`] = () => ({
      status: 503,
      body: {
        error: {
          code: "EXTERNAL_SERVICE_ERROR",
          message: "Today's email sending limit is reached. Try again later.",
        },
      },
    });
    renderWithClient(
      <EmailInvitation guest={guest()} timeZone="Asia/Kolkata" onAddEmail={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: GUESTS.email.send }));
    expect(await screen.findByRole("alert")).toHaveTextContent("sending limit is reached");
  });

  it("explains the hourly limit on single emails", async () => {
    replies[`POST /api/guests/${ID}/send-invitation`] = () => ({
      status: 429,
      body: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    });
    renderWithClient(
      <EmailInvitation guest={guest()} timeZone="Asia/Kolkata" onAddEmail={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: GUESTS.email.send }));
    expect(await screen.findByRole("alert")).toHaveTextContent(GUESTS.email.rateLimited);
  });

  it("asks for an email address first", () => {
    const onAddEmail = vi.fn();
    renderWithClient(
      <EmailInvitation
        guest={guest({ email: null })}
        timeZone="Asia/Kolkata"
        onAddEmail={onAddEmail}
      />,
    );
    expect(screen.getByText(GUESTS.email.noEmail)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: GUESTS.email.addEmail }));
    expect(onAddEmail).toHaveBeenCalled();
  });
});

describe("bulk email", () => {
  it("asks first, then queues invitations for everyone not yet emailed", async () => {
    replies["POST /api/guests/actions/send-invitations"] = () => ({
      status: 200,
      body: { data: { batchId: BATCH, jobsCreated: 3 } },
    });
    const onStarted = vi.fn();
    renderWithClient(<BulkEmailButton kind="invitations" count={3} onStarted={onStarted} />);

    fireEvent.click(screen.getByRole("button", { name: GUESTS.bulk.invitations.button(3) }));
    const dialog = within(screen.getByRole("dialog", { name: GUESTS.bulk.invitations.title }));
    fireEvent.click(dialog.getByRole("button", { name: GUESTS.bulk.invitations.confirm }));

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(BATCH));
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({ scope: "ALL_UNSENT" });
  });

  it("is hidden when there is no one to email", () => {
    renderWithClient(<BulkEmailButton kind="reminders" count={0} onStarted={vi.fn()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows progress, then the result, and retries the ones that failed", async () => {
    let status = batch({ pending: 2, sent: 1, completed: false });
    replies[`GET /api/email-batches/${BATCH}`] = () => ({ status: 200, body: { data: status } });
    replies[`POST /api/email-batches/${BATCH}/retry-failed`] = () => ({
      status: 200,
      body: { data: batch({ pending: 1, sent: 2, failed: 0, completed: false }) },
    });
    renderWithClient(<BulkEmailProgress kind="reminders" batchId={BATCH} onDismiss={vi.fn()} />);

    expect(await screen.findByText(GUESTS.bulk.reminders.progress(1, 3))).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");

    status = batch({ sent: 2, failed: 1, completed: true });
    expect(
      await screen.findByText(GUESTS.bulk.reminders.done(2), undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(GUESTS.bulk.failed(1))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: GUESTS.bulk.retry }));
    await waitFor(() =>
      expect(calls.some((call) => call.url.endsWith("/retry-failed"))).toBe(true),
    );
  });
  it("says so instead of opening a panel when everyone already has one on its way", async () => {
    replies["POST /api/guests/actions/send-invitations"] = () => ({
      status: 200,
      body: { data: { batchId: BATCH, jobsCreated: 0 } },
    });
    const onStarted = vi.fn();
    renderWithClient(<BulkEmailButton kind="invitations" count={3} onStarted={onStarted} />);

    fireEvent.click(screen.getByRole("button", { name: GUESTS.bulk.invitations.button(3) }));
    const dialog = within(screen.getByRole("dialog", { name: GUESTS.bulk.invitations.title }));
    fireEvent.click(dialog.getByRole("button", { name: GUESTS.bulk.invitations.confirm }));

    expect(await dialog.findByText(GUESTS.bulk.invitations.alreadySending)).toBeInTheDocument();
    expect(onStarted).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: GUESTS.bulk.close }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stops checking a batch it can't read, and can be dismissed", async () => {
    replies[`GET /api/email-batches/${BATCH}`] = () => ({
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Not found" } },
    });
    const onDismiss = vi.fn();
    renderWithClient(
      <BulkEmailProgress kind="invitations" batchId={BATCH} onDismiss={onDismiss} />,
    );

    expect(await screen.findByText(GUESTS.bulk.statusError)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    // Longer than one polling interval: no second check.
    await new Promise((resolve) => setTimeout(resolve, 3500));
    expect(calls.filter((call) => call.url === `/api/email-batches/${BATCH}`)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: GUESTS.bulk.dismiss }));
    expect(onDismiss).toHaveBeenCalled();
  }, 10_000);

  it("refreshes guest lists only when a check finds more emails done", async () => {
    let status = batch({ pending: 3, sent: 0, completed: false });
    replies[`GET /api/email-batches/${BATCH}`] = () => ({ status: 200, body: { data: status } });
    replies["GET /api/guests/rsvp-summary"] = () => ({ status: 200, body: { data: {} } });
    renderWithClient(
      <>
        <SummaryProbe />
        <BulkEmailProgress kind="invitations" batchId={BATCH} onDismiss={vi.fn()} />
      </>,
    );
    expect(await screen.findByText(GUESTS.bulk.invitations.progress(0, 3))).toBeInTheDocument();
    await waitFor(() => expect(summaryFetches()).toBe(1));

    await checkBatchNow();
    await checkBatchNow();
    expect(summaryFetches()).toBe(1);

    status = batch({ pending: 2, sent: 1, completed: false });
    await checkBatchNow();
    expect(await screen.findByText(GUESTS.bulk.invitations.progress(1, 3))).toBeInTheDocument();
    await waitFor(() => expect(summaryFetches()).toBe(2));
  });
  it("says it can't check while offline, then carries on once back online", async () => {
    replies[`GET /api/email-batches/${BATCH}`] = () => ({
      status: 200,
      body: { data: batch({ pending: 2, sent: 1, completed: false }) },
    });
    onlineManager.setOnline(false);
    try {
      renderWithClient(<BulkEmailProgress kind="reminders" batchId={BATCH} onDismiss={vi.fn()} />);
      expect(await screen.findByText(GUESTS.bulk.statusError)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: GUESTS.bulk.dismiss })).toBeInTheDocument();
    } finally {
      act(() => onlineManager.setOnline(true));
    }
    expect(await screen.findByText(GUESTS.bulk.reminders.progress(1, 3))).toBeInTheDocument();
  });
  it("explains the hourly limit on bulk sends instead of asking to try again", async () => {
    replies["POST /api/guests/actions/send-reminders"] = () => ({
      status: 429,
      body: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
    });
    renderWithClient(<BulkEmailButton kind="reminders" count={2} onStarted={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: GUESTS.bulk.reminders.button(2) }));
    const dialog = within(screen.getByRole("dialog", { name: GUESTS.bulk.reminders.title }));
    fireEvent.click(dialog.getByRole("button", { name: GUESTS.bulk.reminders.confirm }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(GUESTS.bulk.rateLimited);
  });
});
