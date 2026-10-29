// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SIGN_OUT } from "@/features/auth/auth-content";

import { CREATE_WEDDING } from "../create-wedding-content";
import { CreateWeddingScreen } from "./create-wedding-screen";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const reply = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CreateWeddingScreen userName="Romeo Montague" />
    </QueryClientProvider>,
  );
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: CREATE_WEDDING.submit }));
const fill = () => {
  type("Bride's name", "Juliet");
  type("Groom's name", "Romeo");
  type("Wedding date", "2027-02-14");
  type("City", "Dehradun");
  type("State", "Uttarakhand");
};
// The desktop panel and the phone strip both render the preview; check the first.
const preview = () => within(screen.getAllByRole("region", { name: "Preview" })[0]!);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T06:00:00Z"));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replace.mockReset();
});

describe("<CreateWeddingScreen />", () => {
  it("shows placeholders until details are entered, then a live preview", () => {
    renderScreen();
    expect(preview().getByText(CREATE_WEDDING.preview.placeholderCouple)).toBeInTheDocument();
    expect(preview().getByText(CREATE_WEDDING.preview.countdownPending)).toBeInTheDocument();

    fill();
    expect(preview().getByText("Romeo & Juliet")).toBeInTheDocument();
    expect(preview().getByText("14 February 2027")).toBeInTheDocument();
    expect(preview().getByText("Dehradun, Uttarakhand")).toBeInTheDocument();
    expect(preview().getByText("127 days to go")).toBeInTheDocument();

    type("Wedding title", "Akshay ❤️ Princi");
    expect(preview().getByText("Akshay ❤️ Princi")).toBeInTheDocument();
  });

  it("validates required fields before calling the API", async () => {
    renderScreen();
    submit();
    expect(await screen.findByText("Enter the bride's name")).toBeInTheDocument();
    expect(screen.getByText("Enter the groom's name")).toBeInTheDocument();
    expect(screen.getByText("Choose the wedding date")).toBeInTheDocument();
    expect(screen.getByText("Enter the city")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the wedding and goes to the dashboard", async () => {
    reply(201, { data: { id: "w1", website: { slug: "romeo-juliet-14022027" } } });
    renderScreen();
    fill();
    submit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app"));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/wedding");
    expect(JSON.parse(String(init.body))).toEqual({
      brideName: "Juliet",
      groomName: "Romeo",
      title: "",
      description: "",
      weddingDate: "2027-02-14",
      timeZone: "Asia/Kolkata",
      location: { city: "Dehradun", state: "Uttarakhand", country: "India" },
    });
  });

  it("offers the dashboard when the user already has a wedding", async () => {
    reply(409, { error: { code: "ALREADY_HAS_WEDDING", message: "x" } });
    renderScreen();
    fill();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      CREATE_WEDDING.alreadyHasWedding.title,
    );
    expect(
      screen.getByRole("link", { name: CREATE_WEDDING.alreadyHasWedding.action }),
    ).toHaveAttribute("href", "/app");
  });

  it("lets the time zone be changed", () => {
    renderScreen();
    expect(screen.getByText("India (IST)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: CREATE_WEDDING.changeTimeZone }));
    const select = screen.getByLabelText("Time zone");
    fireEvent.change(select, { target: { value: "Asia/Dubai" } });
    expect(select).toHaveValue("Asia/Dubai");
  });

  it("points invited family members to their invitation link", () => {
    renderScreen();
    expect(screen.getByText(CREATE_WEDDING.invitedNote.title)).toBeInTheDocument();
    expect(screen.getByText(CREATE_WEDDING.adminNote)).toBeInTheDocument();
  });

  it("signs out to the sign-in page", async () => {
    reply(200, { success: true });
    renderScreen();
    expect(screen.getByText("Romeo Montague")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: SIGN_OUT }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/logout");
  });
});
