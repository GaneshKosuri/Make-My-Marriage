// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTasks } from "@/features/tasks/api";

import { useArchiveEvent } from "./api";

const taskListUrl = "/api/tasks?eventId=e1";
let calls: string[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  calls.push(`${init.method ?? "GET"} ${url}`);
  const body =
    init.method === "DELETE"
      ? { success: true }
      : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

function Harness() {
  const tasks = useTasks({ eventId: "e1" });
  const archive = useArchiveEvent();
  return (
    <>
      <p>{tasks.isSuccess ? "loaded" : "loading"}</p>
      <button type="button" onClick={() => archive.mutate("e1")}>
        Archive
      </button>
    </>
  );
}

function renderWithClient(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  calls = [];
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("event mutations", () => {
  it("refresh open task lists, which show the event's name and archived state (review R5)", async () => {
    renderWithClient(<Harness />);
    await screen.findByText("loaded");
    expect(calls.filter((call) => call === `GET ${taskListUrl}`)).toHaveLength(1);

    screen.getByRole("button", { name: "Archive" }).click();
    await waitFor(() =>
      expect(calls.filter((call) => call === `GET ${taskListUrl}`)).toHaveLength(2),
    );
    expect(calls).toContain("DELETE /api/events/e1");
  });
});
