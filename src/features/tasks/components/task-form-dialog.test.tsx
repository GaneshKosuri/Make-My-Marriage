// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskDto } from "@/modules/tasks/task.types";

import { TASKS } from "../tasks-content";
import { TaskFormDialog } from "./task-form-dialog";

const task: TaskDto = {
  id: "t1",
  title: "Book the DJ",
  description: null,
  priority: "MEDIUM",
  status: "TODO",
  dueDate: null,
  completedAt: null,
  assignedMembershipId: null,
  assignee: null,
  event: null,
  version: 2,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};
// Someone else ticked it done and renamed it.
const newer: TaskDto = {
  ...task,
  title: "Book the DJ and lights",
  status: "COMPLETED",
  version: 3,
};

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

const data = (value: unknown) => ({ status: 200, body: { data: value } });

function renderDialog(current: TaskDto) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const dialogFor = (value: TaskDto) => (
    <QueryClientProvider client={client}>
      <TaskFormDialog
        open
        onClose={() => {}}
        task={value}
        timeZone="Asia/Kolkata"
        onSaved={() => {}}
      />
    </QueryClientProvider>
  );
  const result = render(dialogFor(current));
  return { rerenderWith: (value: TaskDto) => result.rerender(dialogFor(value)) };
}

const dialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  routes = {
    "GET /api/members": () => data([]),
    "GET /api/events?includeArchived=false": () => data([]),
  };
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<TaskFormDialog />", () => {
  it("keeps what is being typed when a newer copy arrives, then offers a reload (review R4)", async () => {
    routes["PATCH /api/tasks/t1"] = () => ({
      status: 409,
      body: { error: { code: "CONFLICT", message: "x" } },
    });
    routes["GET /api/tasks/t1"] = () => data(newer);
    const { rerenderWith } = renderDialog(task);

    fireEvent.change(await dialog().findByLabelText("Notes"), {
      target: { value: "Ask about the lights" },
    });
    // A background refetch (window focus, another member's change) brings v3.
    rerenderWith(newer);
    expect(dialog().getByLabelText("Notes")).toHaveValue("Ask about the lights");
    expect(dialog().getByLabelText("Task")).toHaveValue("Book the DJ");

    // Saving is based on v2, so it is refused instead of overwriting v3.
    fireEvent.click(dialog().getByRole("button", { name: TASKS.form.save }));
    expect(await dialog().findByText(TASKS.form.conflict.title)).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      description: "Ask about the lights",
      version: 2,
    });

    fireEvent.click(dialog().getByRole("button", { name: TASKS.form.conflict.action }));
    expect(await dialog().findByDisplayValue("Book the DJ and lights")).toBeInTheDocument();
    expect(dialog().getByLabelText("Status")).toHaveValue("COMPLETED");
    expect(dialog().queryByText(TASKS.form.conflict.title)).not.toBeInTheDocument();
  });

  it("explains a failed members or events list instead of showing empty choices (review R6)", async () => {
    routes["GET /api/members"] = () => ({
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "x" } },
    });
    renderDialog({ ...task, assignedMembershipId: "m1" });

    expect(await dialog().findByText(TASKS.form.optionsError)).toBeInTheDocument();
    expect(dialog().queryByLabelText("Assigned to")).not.toBeInTheDocument();

    routes["GET /api/members"] = () => data([]);
    fireEvent.click(dialog().getByRole("button", { name: TASKS.form.optionsRetry }));
    expect(await dialog().findByLabelText("Assigned to")).toBeInTheDocument();
  });
});
