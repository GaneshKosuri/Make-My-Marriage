// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberDto, MemberInvitationDto } from "@/modules/members/member.types";

import { MEMBERS } from "../members-content";
import { MembersScreen } from "./members-screen";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => "/app/settings/members",
}));

const member = (id: string, name: string, role: MemberDto["role"]): MemberDto => ({
  membershipId: id,
  user: { id: `u-${id}`, name, email: `${name.split(" ")[0]!.toLowerCase()}@example.com` },
  role,
  joinedAt: "2026-10-03T06:30:00.000Z",
});
const akshay = member("m1", "Akshay Saini", "ADMIN");
const princi = member("m2", "Princi Rawat", "ADMIN");
const rahul = member("m3", "Rahul Sharma", "MANAGER");
const invitation: MemberInvitationDto = {
  id: "i1",
  email: "neha@example.com",
  role: "MANAGER",
  status: "PENDING",
  expiresAt: "2026-11-05T06:30:00.000Z",
};

type Handler = (body: unknown) => { status: number; body: unknown };
let routes: Record<string, Handler>;
const calls: { method: string; url: string; body: unknown }[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, url, body });
  const handler = routes[`${method} ${url}`];
  const result = handler
    ? handler(body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

const data = (value: unknown) => ({ status: 200, body: { data: value } });
const success = () => ({ status: 200, body: { success: true } });
const apiError = (status: number, code: string, details?: Record<string, string>) => ({
  status,
  body: { error: { code, message: "x", ...(details ? { details } : {}) } },
});

function renderScreen(
  role: "ADMIN" | "MANAGER" = "ADMIN",
  currentMembershipId = akshay.membershipId,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MembersScreen
        role={role}
        currentMembershipId={currentMembershipId}
        timeZone="Asia/Kolkata"
      />
    </QueryClientProvider>,
  );
}

const membersCard = () => within(screen.getByRole("region", { name: MEMBERS.listTitle }));
const invitationsCard = () =>
  within(screen.getByRole("region", { name: MEMBERS.invitationsTitle }));
const mutations = () => calls.filter((call) => call.method !== "GET");

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  routes = {
    "GET /api/members": () => data([akshay, princi, rahul]),
    "GET /api/members/invitations": () => data([invitation]),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  calls.length = 0;
  replace.mockReset();
  refresh.mockReset();
});

describe("<MembersScreen /> as an Admin", () => {
  it("lists members with their role, email and join date, marking you", async () => {
    renderScreen();
    expect(await membersCard().findByText("Akshay Saini")).toBeInTheDocument();
    expect(membersCard().getByText(`(${MEMBERS.you})`)).toBeInTheDocument();
    expect(membersCard().getByText("rahul@example.com")).toBeInTheDocument();
    expect(membersCard().getAllByText(MEMBERS.joined("3 Oct 2026"))).toHaveLength(3);
    expect(membersCard().getByText(MEMBERS.listDescription(3))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Wedding Members" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("promotes a Manager", async () => {
    routes["PATCH /api/members/m3"] = () => data({ ...rahul, role: "ADMIN" });
    renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: `${MEMBERS.makeAdmin}: Rahul Sharma` }),
    );
    await waitFor(() =>
      expect(mutations()).toEqual([
        { method: "PATCH", url: "/api/members/m3", body: { role: "ADMIN" } },
      ]),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("removes a member after confirming", async () => {
    routes["DELETE /api/members/m3"] = success;
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: `${MEMBERS.remove}: Rahul Sharma` }));

    const dialog = within(
      screen.getByRole("dialog", { name: MEMBERS.confirm.removeTitle("Rahul Sharma") }),
    );
    expect(mutations()).toEqual([]);
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.remove }));

    await waitFor(() =>
      expect(mutations()).toEqual([{ method: "DELETE", url: "/api/members/m3", body: undefined }]),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("explains LAST_ADMIN from the server", async () => {
    routes["PATCH /api/members/m2"] = () => apiError(409, "LAST_ADMIN");
    renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: `${MEMBERS.makeManager}: Princi Rawat` }),
    );
    expect(await membersCard().findByRole("alert")).toHaveTextContent(MEMBERS.lastAdmin);
  });

  it("lets you leave the wedding, then sends you to create one", async () => {
    routes["DELETE /api/members/m1"] = success;
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: MEMBERS.leave }));
    const dialog = within(screen.getByRole("dialog", { name: MEMBERS.confirm.leaveTitle }));
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.leave }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/create-wedding"));
    // No refetch of a list you can no longer see (it would flash a 403 error).
    const gets = calls.filter((call) => call.url === "/api/members");
    expect(gets).toHaveLength(1);
    expect(membersCard().queryByRole("alert")).toBeNull();
  });

  it("asks before you step down, then refreshes your view", async () => {
    routes["PATCH /api/members/m1"] = () => data({ ...akshay, role: "MANAGER" });
    renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: `${MEMBERS.makeManager}: Akshay Saini` }),
    );
    const dialog = within(screen.getByRole("dialog", { name: MEMBERS.confirm.demoteSelfTitle }));
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.makeManager }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("offers no way to demote or remove the only Admin", async () => {
    routes["GET /api/members"] = () => data([akshay, rahul]);
    renderScreen();
    expect(await membersCard().findByText(MEMBERS.lastAdmin)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: MEMBERS.leave })).toBeNull();
    expect(
      screen.queryByRole("button", { name: `${MEMBERS.makeManager}: Akshay Saini` }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: `${MEMBERS.remove}: Rahul Sharma` }),
    ).toBeInTheDocument();
  });
});

describe("<MembersScreen /> invitations", () => {
  it("invites by email and role, then confirms it was sent", async () => {
    routes["POST /api/members/invitations"] = (body) =>
      data({ ...invitation, id: "i2", ...(body as object) });
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: MEMBERS.invite }));

    const dialog = within(screen.getByRole("dialog", { name: MEMBERS.inviteDialog.title }));
    fireEvent.change(dialog.getByLabelText(MEMBERS.inviteDialog.email), {
      target: { value: "vikram@example.com" },
    });
    fireEvent.click(dialog.getByLabelText(/^Admin/));
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.inviteDialog.submit }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      MEMBERS.inviteDialog.sent("vikram@example.com"),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mutations()).toEqual([
      {
        method: "POST",
        url: "/api/members/invitations",
        body: { email: "vikram@example.com", role: "ADMIN" },
      },
    ]);
  });

  it("shows 'already a member' on the email field", async () => {
    routes["POST /api/members/invitations"] = () =>
      apiError(409, "CONFLICT", { email: "This person is already a member of your wedding." });
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: MEMBERS.invite }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText(MEMBERS.inviteDialog.email), {
      target: { value: "rahul@example.com" },
    });
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.inviteDialog.submit }));
    expect(
      await dialog.findByText("This person is already a member of your wedding."),
    ).toBeInTheDocument();
    expect(dialog.queryByRole("alert")).toBeNull();
  });

  it("says so when the email could not be sent", async () => {
    routes["POST /api/members/invitations"] = () => apiError(503, "EXTERNAL_SERVICE_ERROR");
    renderScreen();
    fireEvent.click(screen.getByRole("button", { name: MEMBERS.invite }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText(MEMBERS.inviteDialog.email), {
      target: { value: "vikram@example.com" },
    });
    fireEvent.click(dialog.getByRole("button", { name: MEMBERS.inviteDialog.submit }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      MEMBERS.inviteDialog.emailFailed.title,
    );
  });

  it("lists pending invitations with their expiry, and revokes one", async () => {
    routes["DELETE /api/members/invitations/i1"] = success;
    renderScreen();
    expect(await invitationsCard().findByText("neha@example.com")).toBeInTheDocument();
    expect(invitationsCard().getByText(MEMBERS.expires("5 Nov 2026"))).toBeInTheDocument();

    fireEvent.click(
      invitationsCard().getByRole("button", { name: `${MEMBERS.revoke}: neha@example.com` }),
    );
    await waitFor(() =>
      expect(mutations()).toEqual([
        { method: "DELETE", url: "/api/members/invitations/i1", body: undefined },
      ]),
    );
  });

  it("resends a fresh link in one request", async () => {
    routes["POST /api/members/invitations/i1/resend"] = () => data(invitation);
    renderScreen();
    fireEvent.click(
      await invitationsCard().findByRole("button", { name: `${MEMBERS.resend}: neha@example.com` }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(MEMBERS.resent("neha@example.com"));
    expect(mutations()).toEqual([
      { method: "POST", url: "/api/members/invitations/i1/resend", body: undefined },
    ]);
  });

  it("has a friendly empty state", async () => {
    routes["GET /api/members/invitations"] = () => data([]);
    renderScreen();
    expect(await invitationsCard().findByText(MEMBERS.noInvitations)).toBeInTheDocument();
  });
});

describe("<MembersScreen /> as a Manager", () => {
  it("shows the list read-only and never asks for invitations", async () => {
    renderScreen("MANAGER", rahul.membershipId);
    expect(await membersCard().findByText("Akshay Saini")).toBeInTheDocument();
    expect(screen.getByText(MEMBERS.managerNote)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: MEMBERS.invite })).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(MEMBERS.remove) })).toBeNull();
    expect(screen.queryByRole("button", { name: MEMBERS.leave })).toBeNull();
    expect(screen.queryByRole("region", { name: MEMBERS.invitationsTitle })).toBeNull();
    expect(calls.map((call) => call.url)).toEqual(["/api/members"]);
  });
});
