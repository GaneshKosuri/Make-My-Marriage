// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fieldSegments, fieldValue, typeDate } from "@/components/ui/date-time-fields.test-helpers";
import { addDays, dateOnlyInTimeZone } from "@/lib/dates";
import { latestWeddingDate } from "@/modules/weddings/wedding.schemas";
import type { WeddingDto } from "@/modules/weddings/wedding.types";

import { CREATE_WEDDING } from "../create-wedding-content";
import { WEDDING_DETAILS } from "../wedding-details-content";
import { WeddingDetailsScreen } from "./wedding-details-screen";

// Wedding dates must be within 5 years: next year's dates are always valid.
const NEXT_YEAR = new Date().getUTCFullYear() + 1;

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/settings",
}));

const wedding: WeddingDto = {
  id: "w1",
  brideName: "Princi",
  groomName: "Akshay",
  title: null,
  description: "We're getting married!",
  weddingDate: `${NEXT_YEAR}-02-14`,
  timeZone: "Asia/Kolkata",
  location: {
    city: "Dehradun",
    state: "Uttarakhand",
    country: "India",
    formattedAddress: "Dehradun, Uttarakhand, India",
    latitude: null,
    longitude: null,
    googlePlaceId: null,
  },
  website: {
    slug: `akshay-princi-1402${NEXT_YEAR}`,
    theme: "CLASSIC",
    isPublished: false,
    welcomeMessage: null,
  },
  gallery: { isEnabled: false, guestUploadsEnabled: false },
  livestream: { youtubeUrl: null, isEnabled: false },
};

type Reply = { status: number; body: unknown };
let getReply: Reply;
let patchReply: (body: unknown) => Reply;
const patches: unknown[] = [];

const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
  const result =
    init.method === "PATCH"
      ? (() => {
          const body = JSON.parse(String(init.body)) as unknown;
          patches.push(body);
          return patchReply(body);
        })()
      : getReply;
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WeddingDetailsScreen />
    </QueryClientProvider>,
  );
}

const FIELDS = CREATE_WEDDING.fields;
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = () => fireEvent.click(screen.getByRole("button", { name: WEDDING_DETAILS.save }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  getReply = { status: 200, body: { data: wedding } };
  patchReply = (body) => ({ status: 200, body: { data: { ...wedding, ...(body as object) } } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  patches.length = 0;
  refresh.mockReset();
});

describe("<WeddingDetailsScreen />", () => {
  it("fills the form with the current details and the fixed web address", async () => {
    renderScreen();
    expect(await screen.findByLabelText(FIELDS.brideName.label)).toHaveValue("Princi");
    expect(screen.getByLabelText(FIELDS.groomName.label)).toHaveValue("Akshay");
    expect(fieldValue("weddingDate")).toBe(`${NEXT_YEAR}-02-14`);
    expect(screen.getByLabelText(FIELDS.city.label)).toHaveValue("Dehradun");
    expect(screen.getByLabelText(FIELDS.timeZone.label)).toHaveValue("Asia/Kolkata");
    expect(screen.getByText(`/w/akshay-princi-1402${NEXT_YEAR}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: WEDDING_DETAILS.save })).toBeDisabled();
  });

  it("keeps a stored time zone the picker would not list (an alias id)", async () => {
    getReply = { status: 200, body: { data: { ...wedding, timeZone: "Asia/Calcutta" } } };
    renderScreen();
    expect(await screen.findByLabelText(FIELDS.timeZone.label)).toHaveValue("Asia/Calcutta");
  });

  it("saves only what changed, then confirms and refreshes the header", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    type(FIELDS.description.label, "Two families, one celebration.");
    save();

    expect(await screen.findByRole("status")).toHaveTextContent(WEDDING_DETAILS.saved);
    expect(patches).toEqual([{ description: "Two families, one celebration." }]);
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: WEDDING_DETAILS.save })).toBeDisabled();
  });

  it("sends the whole place when any part of it changes", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.city.label);
    type(FIELDS.city.label, "Udaipur");
    save();
    await waitFor(() =>
      expect(patches).toEqual([
        { location: { city: "Udaipur", state: "Uttarakhand", country: "India" } },
      ]),
    );
  });

  it("validates before saving", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    type(FIELDS.brideName.label, " ");
    save();
    expect(await screen.findByText("Enter the bride's name")).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("shows the server's date check on the date field", async () => {
    patchReply = () => ({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "x",
          details: { weddingDate: "Choose today or a later date" },
        },
      },
    });
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    await typeDate(FIELDS.weddingDate.label, `${NEXT_YEAR}-03-01`);
    save();
    expect(await screen.findByText("Choose today or a later date")).toBeInTheDocument();
    expect(screen.queryByText(WEDDING_DETAILS.saveError.title)).toBeNull();
  });

  it("flags a past or too-distant date as soon as it is changed, and does not send it", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    await typeDate(FIELDS.weddingDate.label, "2020-01-01");
    expect(screen.getByText("Choose today or a later date")).toBeInTheDocument();
    await typeDate(FIELDS.weddingDate.label, "2099-12-31");
    expect(screen.getByText("Choose a date within the next 5 years")).toBeInTheDocument();
    save();
    await waitFor(() => expect(fieldSegments(FIELDS.weddingDate.label)[0]).toHaveFocus());
    expect(patches).toEqual([]);
  });

  it("says when changes were not saved", async () => {
    patchReply = () => ({ status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } });
    renderScreen();
    await screen.findByLabelText(FIELDS.title.label);
    type(FIELDS.title.label, "Our big day");
    save();
    expect(await screen.findByText(WEDDING_DETAILS.saveError.title)).toBeInTheDocument();
  });

  it("keeps the save bar in place until there is something to save", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.groomName.label);
    const bar = () => screen.getByRole("button", { name: WEDDING_DETAILS.save }).parentElement!;
    expect(bar()).not.toHaveClass("sticky");
    type(FIELDS.groomName.label, "Vikram");
    expect(bar()).toHaveClass("sticky");
    fireEvent.click(screen.getByRole("button", { name: WEDDING_DETAILS.discard }));
    expect(bar()).not.toHaveClass("sticky");
  });

  it("discards unsaved changes", async () => {
    renderScreen();
    await screen.findByLabelText(FIELDS.groomName.label);
    type(FIELDS.groomName.label, "Vikram");
    fireEvent.click(screen.getByRole("button", { name: WEDDING_DETAILS.discard }));
    expect(screen.getByLabelText(FIELDS.groomName.label)).toHaveValue("Akshay");
    expect(screen.getByRole("button", { name: WEDDING_DETAILS.save })).toBeDisabled();
  });

  it("offers a retry when the details cannot be loaded", async () => {
    getReply = { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
    renderScreen();
    expect(await screen.findByText(WEDDING_DETAILS.loadError.title)).toBeInTheDocument();
    getReply = { status: 200, body: { data: wedding } };
    fireEvent.click(screen.getByRole("button", { name: WEDDING_DETAILS.loadError.retry }));
    expect(await screen.findByLabelText(FIELDS.brideName.label)).toHaveValue("Princi");
  });

  it("keeps a wedding date that has passed valid, and saves other changes (review D1)", async () => {
    const user = userEvent.setup();
    getReply = { status: 200, body: { data: { ...wedding, weddingDate: "2020-03-01" } } };
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    expect(fieldValue("weddingDate")).toBe("2020-03-01");
    const group = screen.getAllByRole("group", { name: FIELDS.weddingDate.label })[0]!;
    expect(group).not.toHaveAttribute("data-invalid");

    // The stored day is still a normal, pickable day in the calendar.
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const grid = await screen.findByRole("grid");
    expect(within(grid).getByRole("button", { name: /\s1 March 2020/ })).not.toHaveAttribute(
      "aria-disabled",
    );
    await user.keyboard("{Escape}");

    type(FIELDS.brideName.label, "Princi Rawat");
    save();
    await waitFor(() => expect(patches).toEqual([{ brideName: "Princi Rawat" }]));
  });

  it("offers no calendar days past the 5-year limit (review D7)", async () => {
    const user = userEvent.setup();
    const today = dateOnlyInTimeZone(new Date(), "Asia/Kolkata");
    const latest = latestWeddingDate(today);
    renderScreen();
    await screen.findByLabelText(FIELDS.brideName.label);
    await typeDate(FIELDS.weddingDate.label, latest);
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const grid = await screen.findByRole("grid");
    // Calendar days are named like "Friday, 12 November 2031".
    const dayName = (date: string) =>
      new RegExp(
        new Intl.DateTimeFormat("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${date}T00:00:00Z`)),
      );
    expect(within(grid).getByRole("button", { name: dayName(latest) })).not.toHaveAttribute(
      "aria-disabled",
    );
    const dayAfter = addDays(latest, 1);
    if (dayAfter.slice(0, 7) === latest.slice(0, 7)) {
      // Same month on screen: the day after the limit can't be picked.
      expect(within(grid).getByRole("button", { name: dayName(dayAfter) })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });
});
