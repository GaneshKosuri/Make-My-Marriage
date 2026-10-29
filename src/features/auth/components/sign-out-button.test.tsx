// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SIGN_OUT } from "../auth-content";
import { SignOutButton } from "./sign-out-button";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

function renderButton() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SignOutButton />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  replace.mockReset();
  vi.unstubAllGlobals();
});

describe("<SignOutButton />", () => {
  it("ends the session and goes to sign-in", async () => {
    reply(200, { success: true });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: SIGN_OUT }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/auth/logout");
    expect(fetchMock.mock.calls[0]![1].method).toBe("POST");
  });

  it("still goes to sign-in when the session had already ended", async () => {
    reply(401, { error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." } });
    renderButton();
    fireEvent.click(screen.getByRole("button", { name: SIGN_OUT }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });

  it("is disabled while signing out, so a double click sends one request", async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
    renderButton();
    const button = screen.getByRole("button", { name: SIGN_OUT });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    fireEvent.click(button);
    respond(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
