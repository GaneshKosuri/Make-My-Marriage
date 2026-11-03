// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_ROUTES } from "@/features/auth/auth-content";
import type { PublicMemberInvitationDto } from "@/modules/members/member.types";

import { JOIN } from "../join-content";
import { JoinScreen, type JoinInvitationState, type JoinViewer } from "./join-screen";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

type Reply = { status: number; body: unknown };
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

function reply({ status, body }: Reply) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}
const apiError = (status: number, code: string) => ({
  status,
  body: { error: { code, message: "x" } },
});

const TOKEN = "t".repeat(43);
const ACCEPT_URL = `/api/member-invitations/${TOKEN}/accept`;
const invitation: PublicMemberInvitationDto = {
  email: "Rahul@Example.com",
  role: "MANAGER",
  wedding: { brideName: "Princi", groomName: "Akshay", weddingDate: "2027-02-14" },
  requiresLogin: true,
};
const ok: JoinInvitationState = { status: "ok", invitation };
const rahul: JoinViewer = { name: "Rahul Sharma", email: "rahul@example.com", hasWedding: false };

function renderJoin(state: JoinInvitationState, viewer: JoinViewer | null = null) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const ui: ReactElement = <JoinScreen token={TOKEN} state={state} viewer={viewer} />;
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const requests = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url,
    method: init.method,
    body: init.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
  }));

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  replace.mockReset();
  refresh.mockReset();
});

describe("<JoinScreen /> invitation states", () => {
  it("explains an unusable link and offers sign-in", () => {
    renderJoin({ status: "not-found" });
    expect(screen.getByRole("heading", { name: JOIN.ended.invalid.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: JOIN.ended.signIn })).toHaveAttribute(
      "href",
      AUTH_ROUTES.signIn,
    );
  });

  it("offers the dashboard instead when signed in", () => {
    renderJoin({ status: "not-found" }, rahul);
    expect(screen.getByRole("link", { name: JOIN.ended.dashboard })).toHaveAttribute(
      "href",
      AUTH_ROUTES.app,
    );
  });

  it("offers a reload when the invitation could not be loaded", () => {
    renderJoin({ status: "unavailable" });
    click(JOIN.unavailable.action);
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the couple, date and role", () => {
    renderJoin(ok);
    expect(
      screen.getByRole("heading", { name: "Help plan Akshay & Princi's wedding" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/14 February 2027 · as a Manager/)).toBeInTheDocument();
  });
});

describe("<JoinScreen /> signed out", () => {
  it("creates the account with the invited email, then joins and opens the dashboard", async () => {
    reply({
      status: 201,
      body: {
        data: {
          user: { id: "u1", name: "Rahul Sharma", email: invitation.email },
          hasWedding: false,
        },
      },
    });
    reply({ status: 200, body: { data: { weddingId: "w1", role: "MANAGER" } } });
    renderJoin(ok);

    const email = screen.getByLabelText("Email address");
    expect(email).toHaveValue(invitation.email);
    expect(email).toHaveAttribute("readonly");

    type("Full name", "Rahul Sharma");
    type("Password", "correct horse battery");
    click(JOIN.createAndJoin);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(AUTH_ROUTES.app));
    expect(requests()).toEqual([
      {
        url: "/api/auth/signup",
        method: "POST",
        body: { name: "Rahul Sharma", email: invitation.email, password: "correct horse battery" },
      },
      { url: ACCEPT_URL, method: "POST", body: undefined },
    ]);
  });

  it("explains ALREADY_HAS_WEDDING straight after signing up", async () => {
    reply({
      status: 201,
      body: {
        data: {
          user: { id: "u1", name: "Rahul Sharma", email: invitation.email },
          hasWedding: false,
        },
      },
    });
    reply(apiError(409, "ALREADY_HAS_WEDDING"));
    renderJoin(ok);

    type("Full name", "Rahul Sharma");
    type("Password", "correct horse battery");
    click(JOIN.createAndJoin);

    expect(await screen.findByText(JOIN.alreadyHasWedding.title)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("switches to sign-in when the email already has an account, then joins", async () => {
    reply(apiError(409, "EMAIL_ALREADY_EXISTS"));
    reply({
      status: 200,
      body: {
        data: {
          user: { id: "u1", name: "Rahul Sharma", email: "rahul@example.com" },
          hasWedding: false,
        },
      },
    });
    reply({ status: 200, body: { data: { weddingId: "w1", role: "MANAGER" } } });
    renderJoin(ok);

    type("Full name", "Rahul Sharma");
    type("Password", "correct horse battery");
    click(JOIN.createAndJoin);
    fireEvent.click(await screen.findByRole("button", { name: JOIN.emailTaken.action }));

    expect(screen.getByRole("tab", { name: JOIN.signInTab })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    type("Password", "correct horse battery");
    click(JOIN.signInAndJoin);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(AUTH_ROUTES.app));
    expect(requests().map((request) => request.url)).toEqual([
      "/api/auth/signup",
      "/api/auth/login",
      ACCEPT_URL,
    ]);
    expect(requests()[1]?.body).toEqual({
      email: invitation.email,
      password: "correct horse battery",
    });
  });

  it("does not accept for an account that already has a wedding", async () => {
    reply({
      status: 200,
      body: {
        data: {
          user: { id: "u1", name: "Rahul Sharma", email: "rahul@example.com" },
          hasWedding: true,
        },
      },
    });
    renderJoin(ok);
    fireEvent.click(screen.getByRole("tab", { name: JOIN.signInTab }));
    type("Password", "correct horse battery");
    click(JOIN.signInAndJoin);

    expect(await screen.findByText(JOIN.alreadyHasWedding.title)).toBeInTheDocument();
    expect(requests().map((request) => request.url)).toEqual(["/api/auth/login"]);
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows wrong passwords on the sign-in form", async () => {
    reply(apiError(401, "UNAUTHENTICATED"));
    renderJoin(ok);
    fireEvent.click(screen.getByRole("tab", { name: JOIN.signInTab }));
    type("Password", "wrong password");
    click(JOIN.signInAndJoin);
    expect(await screen.findByText(JOIN.invalidCredentials.title)).toBeInTheDocument();
  });
});

describe("<JoinScreen /> signed in", () => {
  it("joins with one click, whatever the email's case", async () => {
    reply({ status: 200, body: { data: { weddingId: "w1", role: "MANAGER" } } });
    renderJoin(ok, rahul);
    expect(screen.getByText(JOIN.signedInAs("Rahul Sharma"))).toBeInTheDocument();

    click(JOIN.accept);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(AUTH_ROUTES.app));
    expect(requests()).toEqual([{ url: ACCEPT_URL, method: "POST", body: undefined }]);
  });

  it.each([
    ["TOKEN_EXPIRED", 410, JOIN.ended.expired.title],
    ["INVALID_TOKEN", 400, JOIN.ended.invalid.title],
    ["INVITATION_ALREADY_ACCEPTED", 409, JOIN.ended.accepted.title],
    ["ALREADY_HAS_WEDDING", 409, JOIN.alreadyHasWedding.title],
  ])("explains %s", async (code, status, title) => {
    reply(apiError(status, code));
    renderJoin(ok, rahul);
    click(JOIN.accept);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("asks someone signed in with another email to sign out, then shows the forms", async () => {
    reply({ status: 200, body: { success: true } });
    renderJoin(ok, { name: "Priya", email: "priya@example.com", hasWedding: false });

    expect(screen.getByText(JOIN.mismatch.title)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: JOIN.accept })).not.toBeInTheDocument();
    click(JOIN.mismatch.action);

    expect(await screen.findByRole("tab", { name: JOIN.createAccountTab })).toBeInTheDocument();
    expect(requests()).toEqual([{ url: "/api/auth/logout", method: "POST", body: undefined }]);
  });

  it("offers the account switch first, even when the signed-in account has a wedding", () => {
    renderJoin(ok, { name: "Chetan", email: "chetan@example.com", hasWedding: true });
    expect(screen.getByText(JOIN.mismatch.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: JOIN.mismatch.action })).toBeInTheDocument();
    expect(screen.queryByText(JOIN.alreadyHasWedding.title)).toBeNull();
  });

  it("tells members of another wedding they cannot join", () => {
    renderJoin(ok, { ...rahul, hasWedding: true });
    expect(screen.getByText(JOIN.alreadyHasWedding.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: JOIN.alreadyHasWedding.action })).toHaveAttribute(
      "href",
      AUTH_ROUTES.app,
    );
  });
});
