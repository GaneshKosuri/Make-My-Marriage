// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicInvitationDto } from "@/modules/guests/guest.types";

import { usePublicInvitation, useSubmitRsvp } from "./api";

const TOKEN = "a".repeat(43);
const OTHER_TOKEN = "b".repeat(43);

const initial: PublicInvitationDto = {
  guest: { name: "Rajesh Sharma", maxGuests: 4, rsvpStatus: "PENDING", attendingCount: null },
  wedding: {
    brideName: "Princi",
    groomName: "Akshay",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
    title: null,
    location: null,
  },
  events: [],
};

/** BroadcastChannel as browsers have it: every other open channel of that name hears a post. */
class FakeChannel {
  static open: FakeChannel[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  constructor(readonly name: string) {
    FakeChannel.open.push(this);
  }
  postMessage(data: unknown) {
    for (const channel of FakeChannel.open) {
      if (channel !== this && channel.name === this.name)
        channel.onmessage?.({ data } as MessageEvent<unknown>);
    }
  }
  close() {
    FakeChannel.open = FakeChannel.open.filter((channel) => channel !== this);
  }
}

/** A message from another tab, as `useSubmitRsvp` posts it there. */
function postFromAnotherTab(data: unknown) {
  const channel = new FakeChannel("mmm-invitation");
  act(() => channel.postMessage(data));
  channel.close();
}

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  FakeChannel.open = [];
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: { status: "ATTENDING", attendingCount: 3, updatedAt: "2026-11-12T10:00:00Z" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("usePublicInvitation across tabs", () => {
  it("refreshes when another tab saves a reply to this invitation", () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    renderHook(() => usePublicInvitation(TOKEN, initial), { wrapper });

    postFromAnotherTab({ token: TOKEN, from: "another-tab" });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["invitation", TOKEN] });
  });

  it("ignores other invitations and anything that isn't a saved reply", () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    renderHook(() => usePublicInvitation(TOKEN, initial), { wrapper });

    postFromAnotherTab({ token: OTHER_TOKEN, from: "another-tab" });
    postFromAnotherTab(TOKEN);
    postFromAnotherTab(null);

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("ignores its own reply, which it already shows", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(
      () => ({ invitation: usePublicInvitation(TOKEN, initial), submit: useSubmitRsvp(TOKEN) }),
      { wrapper },
    );

    act(() => result.current.submit.mutate({ status: "ATTENDING", attendingCount: 3 }));

    await waitFor(() => expect(result.current.submit.isSuccess).toBe(true));
    expect(result.current.invitation.data.guest).toMatchObject({
      rsvpStatus: "ATTENDING",
      attendingCount: 3,
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
