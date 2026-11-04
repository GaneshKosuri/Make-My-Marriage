// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventDto } from "@/modules/events/event.types";
import type { MemberDto } from "@/modules/members/member.types";
import type { TaskDto } from "@/modules/tasks/task.types";

import { TASKS } from "../tasks-content";
import { TasksScreen, type TasksScreenProps } from "./tasks-screen";

/** The address's query string, as `useSearchParams` reports it. */
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/tasks",
  useSearchParams: () => new URLSearchParams(search),
}));

const PRINCI = "6aeb2fe60d805e865a620a01";
const SANGEET = "6aeb2fe70d805e865a620a08";

const members: MemberDto[] = [
  {
    membershipId: PRINCI,
    user: { id: "u1", name: "Princi Rawat", email: "princi@example.com" },
    role: "ADMIN",
    joinedAt: "2026-10-01T00:00:00.000Z",
  },
];
const sangeet: EventDto = {
  id: SANGEET,
  name: "Sangeet",
  type: "SANGEET",
  startsAt: "2027-02-12T14:30:00.000Z",
  endsAt: null,
  venueName: null,
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 0,
};

const task = (id: string, title: string, extra: Partial<TaskDto> = {}): TaskDto => ({
  id,
  title,
  description: null,
  priority: "MEDIUM",
  status: "TODO",
  dueDate: null,
  completedAt: null,
  assignedMembershipId: null,
  assignee: null,
  event: null,
  version: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
  ...extra,
});

const dj = task("t1", "Book the DJ", {
  priority: "HIGH",
  // Midnight 1 November in India: before "today" (4 November).
  dueDate: "2026-10-31T18:30:00.000Z",
  assignedMembershipId: PRINCI,
  assignee: { membershipId: PRINCI, name: "Princi Rawat", role: "ADMIN" },
  event: { id: SANGEET, name: "Sangeet", archivedAt: null },
  version: 2,
});
const flowers = task("t2", "Order flowers", {
  assignedMembershipId: "6aeb2fe60d805e865a620aff",
  event: { id: "e9", name: "Roka", archivedAt: "2026-10-30T00:00:00.000Z" },
});

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
const page = (items: TaskDto[]) => ({
  status: 200,
  body: {
    data: items,
    pagination: { page: 1, limit: 20, total: items.length, totalPages: items.length ? 1 : 0 },
  },
});
const LIST = "GET /api/tasks?page=1&limit=20";

function renderScreen(props: Partial<TasksScreenProps> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const screenFor = () => (
    <QueryClientProvider client={client}>
      <TasksScreen timeZone="Asia/Kolkata" today="2026-11-04" {...props} />
    </QueryClientProvider>
  );
  const result = render(screenFor());
  /** A link into /app/tasks while the screen stays mounted. */
  const navigate = (nextSearch: string) => {
    search = nextSearch;
    result.rerender(screenFor());
  };
  return { ...result, navigate };
}

const dialog = () => within(screen.getByRole("dialog"));
const list = () => within(screen.getByRole("region", { name: TASKS.views.all }));

beforeEach(() => {
  routes = {
    [LIST]: () => page([dj, flowers]),
    "GET /api/members": () => data(members),
    "GET /api/events?includeArchived=false": () => data([sangeet]),
    "GET /api/events?includeArchived=true": () => data([sangeet]),
  };
  calls.length = 0;
  search = "";
  window.history.replaceState(null, "", "/app/tasks");
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<TasksScreen />", () => {
  it("lists tasks with who, which event and when, flagging overdue ones", async () => {
    renderScreen();

    // The first render in a busy suite can be slow (cold module graph).
    expect(
      await screen.findByRole("button", { name: 'Edit "Book the DJ"' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(list().getByText("Princi Rawat")).toBeInTheDocument();
    expect(list().getByText("Due 1 Nov 2026")).toBeInTheDocument();
    expect(list().getAllByText(TASKS.overdue)).toHaveLength(1);
    // A former member and an archived event stay visible.
    expect(list().getByText(TASKS.formerMember)).toBeInTheDocument();
    expect(list().getByText("Roka (archived)")).toBeInTheDocument();
    expect(list().getByText("1–2 of 2")).toBeInTheDocument();
  });

  it("ticks a task done with the version it was read at", async () => {
    routes[`PATCH /api/tasks/t1`] = () => data({ ...dj, status: "COMPLETED", version: 3 });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: TASKS.markDone("Book the DJ") }));
    await waitFor(() =>
      expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
        status: "COMPLETED",
        version: 2,
      }),
    );
  });

  it("explains a tick that lost to someone else's change and reloads", async () => {
    routes[`PATCH /api/tasks/t1`] = () => ({
      status: 409,
      body: { error: { code: "CONFLICT", message: "x" } },
    });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: TASKS.markDone("Book the DJ") }));
    expect(await screen.findByText(TASKS.statusConflict)).toBeInTheDocument();
    await waitFor(() =>
      expect(calls.filter((call) => call.url === `/api/tasks?page=1&limit=20`)).toHaveLength(2),
    );
  });

  it("switches views and keeps them in the address", async () => {
    routes["GET /api/tasks?page=1&limit=20&mine=true"] = () => page([dj]);
    routes["GET /api/tasks?page=1&limit=20&status=COMPLETED"] = () => page([]);
    renderScreen();
    await screen.findByRole("button", { name: 'Edit "Book the DJ"' });

    fireEvent.click(screen.getByRole("button", { name: TASKS.views.mine }));
    expect(await screen.findByRole("region", { name: TASKS.views.mine })).toBeInTheDocument();
    expect(window.location.search).toBe("?view=mine");
    // My tasks has no "Assigned to" filter.
    expect(screen.queryByLabelText(TASKS.filters.assignee)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: TASKS.views.completed }));
    expect(await screen.findByText(TASKS.empty.completed.title)).toBeInTheDocument();
  });

  it("filters, shows a filtered empty state and clears", async () => {
    routes["GET /api/tasks?page=1&limit=20&eventId=none"] = () => page([]);
    renderScreen();
    await screen.findByRole("button", { name: 'Edit "Book the DJ"' });

    fireEvent.change(screen.getByLabelText(TASKS.filters.event), { target: { value: "none" } });
    expect(await screen.findByText(TASKS.empty.filtered.title)).toBeInTheDocument();
    expect(window.location.search).toBe("?eventId=none");

    fireEvent.click(screen.getAllByRole("button", { name: TASKS.filters.clear })[0]!);
    expect(await screen.findByRole("button", { name: 'Edit "Book the DJ"' })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("adds a task: due day becomes midnight in the wedding's time zone", async () => {
    routes["POST /api/tasks"] = (body) => ({
      status: 201,
      body: { data: task("t9", (body as { title: string }).title) },
    });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: TASKS.add }));
    const form = within(await screen.findByRole("dialog"));
    fireEvent.change(await form.findByLabelText("Task"), { target: { value: " Book the band " } });
    fireEvent.change(form.getByLabelText("Assigned to"), { target: { value: PRINCI } });
    fireEvent.change(form.getByLabelText("Event"), { target: { value: SANGEET } });
    fireEvent.change(form.getByLabelText("Due date"), { target: { value: "2027-01-15" } });
    fireEvent.click(form.getByRole("radio", { name: "High" }));
    fireEvent.click(form.getByRole("button", { name: TASKS.form.save }));

    expect(await screen.findByText('"Book the band" added.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      title: "Book the band",
      description: null,
      assignedMembershipId: PRINCI,
      eventId: SANGEET,
      dueDate: "2027-01-14T18:30:00.000Z",
      priority: "HIGH",
      status: "TODO",
    });
  });

  it("edits only what changed, and deletes after confirming", async () => {
    routes["PATCH /api/tasks/t1"] = (body) => data({ ...dj, ...(body as object), version: 3 });
    routes["DELETE /api/tasks/t1"] = () => ({ status: 200, body: { success: true } });
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: 'Edit "Book the DJ"' }));
    const form = within(await screen.findByRole("dialog"));
    expect(await form.findByLabelText("Event")).toHaveValue(SANGEET);
    expect(form.getByLabelText("Assigned to")).toHaveValue(PRINCI);
    fireEvent.click(form.getByRole("radio", { name: "Low" }));
    fireEvent.click(form.getByRole("button", { name: TASKS.form.save }));
    expect(await screen.findByText('"Book the DJ" saved.')).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      priority: "LOW",
      version: 2,
    });

    fireEvent.click(screen.getByRole("button", { name: 'Edit "Book the DJ"' }));
    fireEvent.click(await dialog().findByRole("button", { name: TASKS.form.delete }));
    fireEvent.click(dialog().getByRole("button", { name: TASKS.form.confirmDelete.confirm }));
    expect(await screen.findByText('"Book the DJ" deleted.')).toBeInTheDocument();
  });

  it("keeps a former member selectable on the task that has one", async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole("button", { name: 'Edit "Order flowers"' }));
    const assignee = await dialog().findByLabelText("Assigned to");
    expect(assignee).toHaveValue(flowers.assignedMembershipId);
    expect(within(assignee).getByRole("option", { name: TASKS.formerMember })).toBeInTheDocument();
  });

  it("opens the add form for an event from ?new=1&eventId and drops the flag", async () => {
    routes[`GET /api/tasks?page=1&limit=20&eventId=${SANGEET}`] = () => page([dj]);
    search = `new=1&eventId=${SANGEET}`;
    renderScreen();

    expect(await dialog().findByLabelText("Event")).toHaveValue(SANGEET);
    await waitFor(() => expect(window.location.search).toBe(`?eventId=${SANGEET}`));
  });

  it("follows links into the screen while it stays mounted (review R1)", async () => {
    routes[`GET /api/tasks?page=1&limit=20&eventId=${SANGEET}`] = () => page([dj]);
    routes["GET /api/tasks?page=1&limit=20&mine=true"] = () => page([flowers]);
    const { navigate } = renderScreen();
    await screen.findByRole("button", { name: 'Edit "Order flowers"' });

    // An event's "All tasks for this event".
    navigate(`eventId=${SANGEET}`);
    await waitFor(() => expect(screen.getByLabelText(TASKS.filters.event)).toHaveValue(SANGEET));
    expect(await screen.findByText("1–1 of 1")).toBeInTheDocument();
    await waitFor(() =>
      expect(calls.at(-1)?.url).toBe(`/api/tasks?page=1&limit=20&eventId=${SANGEET}`),
    );

    // The dashboard's "My tasks".
    navigate("mine=true");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: TASKS.views.mine })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(await screen.findByRole("region", { name: TASKS.views.mine })).toBeInTheDocument();
    expect(calls.some((call) => call.url === "/api/tasks?page=1&limit=20&mine=true")).toBe(true);
  });

  it("moves back a page when the current one comes back empty (review R2)", async () => {
    const twenty = Array.from({ length: 20 }, (_, index) => task(`p${index}`, `Task ${index}`));
    let total = 21;
    routes[LIST] = () => ({
      status: 200,
      body: {
        data: twenty,
        pagination: { page: 1, limit: 20, total, totalPages: Math.ceil(total / 20) },
      },
    });
    routes["GET /api/tasks?page=2&limit=20"] = () => ({
      status: 200,
      // Its only task was deleted meanwhile.
      body: { data: [], pagination: { page: 2, limit: 20, total: 20, totalPages: 1 } },
    });
    renderScreen();

    expect(await screen.findByText("1–20 of 21")).toBeInTheDocument();
    total = 20;
    fireEvent.click(screen.getByRole("button", { name: TASKS.next }));

    expect(await screen.findByText("1–20 of 20")).toBeInTheDocument();
    expect(screen.queryByText(/21–20/)).not.toBeInTheDocument();
  });
});
