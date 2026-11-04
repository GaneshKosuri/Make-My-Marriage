import { describe, expect, it } from "vitest";

import type { TaskDto } from "@/modules/tasks/task.types";

import {
  dueDateInstant,
  emptyTaskForm,
  taskFormSchema,
  taskToForm,
  toCreateTaskBody,
  toUpdateTaskBody,
} from "./task-form";
import { readTasksUrl } from "./url-state";

const TZ = "Asia/Kolkata";
const EVENT = "6aeb2fe70d805e865a620a08";
const MEMBER = "6aeb2fe60d805e865a620a05";

const task: TaskDto = {
  id: "t1",
  title: "Book the DJ",
  description: null,
  priority: "HIGH",
  status: "IN_PROGRESS",
  dueDate: "2027-01-14T18:30:00.000Z",
  completedAt: null,
  assignedMembershipId: MEMBER,
  assignee: null,
  event: { id: EVENT, name: "Sangeet", archivedAt: "2026-11-01T00:00:00.000Z" },
  version: 4,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

describe("task form", () => {
  it("shows the due day in the wedding's time zone and keeps former references", () => {
    expect(taskToForm(task, TZ)).toEqual({
      title: "Book the DJ",
      description: "",
      assignedMembershipId: MEMBER,
      eventId: EVENT,
      dueDate: "2027-01-15",
      priority: "HIGH",
      status: "IN_PROGRESS",
    });
  });

  it("sends midnight of the due day and null for blank choices", () => {
    const values = taskFormSchema.parse({
      ...emptyTaskForm(),
      title: " Flowers ",
      dueDate: "2027-01-15",
    });
    expect(toCreateTaskBody(values, TZ)).toEqual({
      title: "Flowers",
      description: null,
      assignedMembershipId: null,
      eventId: null,
      dueDate: "2027-01-14T18:30:00.000Z",
      priority: "MEDIUM",
      status: "TODO",
    });
    expect(dueDateInstant("", TZ)).toBeNull();
  });

  it("starts a new task linked to an event when asked", () => {
    expect(emptyTaskForm({ eventId: EVENT }).eventId).toBe(EVENT);
  });

  it("sends only changed fields with the version read; an untouched due date is left alone", () => {
    const values = taskFormSchema.parse({ ...taskToForm(task, TZ), eventId: "" });
    expect(toUpdateTaskBody(values, { eventId: true }, TZ, 4)).toEqual({
      eventId: null,
      version: 4,
    });
    expect(toUpdateTaskBody(values, { dueDate: true, status: true }, TZ, 4)).toEqual({
      dueDate: "2027-01-14T18:30:00.000Z",
      status: "IN_PROGRESS",
      version: 4,
    });
  });

  it("needs a title and a real date", () => {
    const result = taskFormSchema.safeParse({ ...emptyTaskForm(), dueDate: "2027-02-30" });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(["title", "dueDate"]);
  });
});

describe("readTasksUrl", () => {
  it("reads the view, filters and the add flag", () => {
    expect(readTasksUrl({ view: "completed", eventId: EVENT, priority: "HIGH", new: "1" })).toEqual(
      {
        view: "completed",
        filters: { eventId: EVENT, priority: "HIGH" },
        startAdding: true,
      },
    );
  });

  it("treats the dashboard's mine=true as My tasks and accepts none", () => {
    expect(readTasksUrl({ mine: "true", assignedMembershipId: "none" })).toEqual({
      view: "mine",
      filters: { assignedMembershipId: "none" },
      startAdding: false,
    });
  });

  it("ignores anything unexpected", () => {
    expect(
      readTasksUrl({ view: "later", status: "DONE", eventId: "abc", priority: ["HIGH", "LOW"] }),
    ).toEqual({ view: "all", filters: { priority: "HIGH" }, startAdding: false });
  });
});
