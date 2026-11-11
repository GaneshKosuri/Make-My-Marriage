// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";

import { fieldValue, typeDate } from "@/components/ui/date-time-fields.test-helpers";

import { EVENTS } from "../events-content";
import { EventFormDialog } from "./event-form-dialog";

const FORM = EVENTS.form;

const mehendi: EventDto = {
  id: "e1",
  name: "Mehendi",
  type: "MEHENDI",
  startsAt: "2027-02-12T10:30:00.000Z",
  endsAt: "2027-02-12T14:30:00.000Z",
  venueName: "Royal Garden",
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 1,
};
const newer: EventDto = { ...mehendi, venueName: "Lake Palace", version: 2 };

type Handler = () => { status: number; body: unknown };
let routes: Record<string, Handler>;
const calls: { method: string; url: string; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined });
  const result = routes[`${method} ${url}`]?.() ?? {
    status: 500,
    body: { error: { code: "INTERNAL_ERROR", message: "x" } },
  };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

function renderDialog(event: EventDto) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const dialogFor = (value: EventDto) => (
    <QueryClientProvider client={client}>
      <EventFormDialog
        open
        onClose={() => {}}
        event={value}
        timeZone="Asia/Kolkata"
        weddingDate="2027-02-14"
        today="2026-11-04"
        onSaved={() => {}}
      />
    </QueryClientProvider>
  );
  const result = render(dialogFor(event));
  return { rerenderWith: (value: EventDto) => result.rerender(dialogFor(value)) };
}

const dialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  routes = {};
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<EventFormDialog />", () => {
  it("keeps what is being typed when a newer copy arrives, then offers a reload (review R4)", async () => {
    routes["PATCH /api/events/e1"] = () => ({
      status: 409,
      body: { error: { code: "CONFLICT", message: "x" } },
    });
    routes["GET /api/events/e1"] = () => ({ status: 200, body: { data: newer } });
    const { rerenderWith } = renderDialog(mehendi);

    fireEvent.change(dialog().getByLabelText("Dress code"), { target: { value: "Green" } });
    rerenderWith(newer);
    expect(dialog().getByLabelText("Dress code")).toHaveValue("Green");
    expect(dialog().getByLabelText("Venue")).toHaveValue("Royal Garden");

    fireEvent.click(dialog().getByRole("button", { name: FORM.save }));
    expect(await dialog().findByText(FORM.conflict.title)).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      dressCode: "Green",
      version: 1,
    });

    fireEvent.click(dialog().getByRole("button", { name: FORM.conflict.action }));
    expect(await dialog().findByDisplayValue("Lake Palace")).toBeInTheDocument();
    expect(dialog().queryByText(FORM.conflict.title)).not.toBeInTheDocument();
  });

  it("moves the end date with the start date (review R3)", async () => {
    // 12 Feb 4 PM to 14 Feb 1 AM.
    renderDialog({ ...mehendi, endsAt: "2027-02-13T19:30:00.000Z" });
    expect(fieldValue("endDate")).toBe("2027-02-14");

    await typeDate("Date", "2027-02-13", dialog());
    expect(fieldValue("endDate")).toBe("2027-02-15");
  });

  it("uses the wedding's today for Today on Ends on (review D6)", async () => {
    const user = userEvent.setup();
    // Started 1 November; the dialog is told today is 4 November in the wedding's zone.
    renderDialog({ ...mehendi, startsAt: "2026-11-01T10:30:00.000Z", endsAt: null });
    const endsOn = dialog().getAllByRole("group", { name: "Ends on" })[0]!;
    await user.click(within(endsOn).getByRole("button", { name: /Open calendar/ }));
    await user.click(await screen.findByRole("button", { name: "Today" }));
    expect(fieldValue("endDate")).toBe("2026-11-04");
  });
});
