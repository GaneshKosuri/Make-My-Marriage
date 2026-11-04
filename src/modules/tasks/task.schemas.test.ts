import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from "./task.schemas";

const ID = "6aeb2fe70d805e865a620a07";

/** [path, message] pairs. */
const issues = (schema: z.ZodType, input: unknown) =>
  schema.safeParse(input).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ?? [];

describe("createTaskSchema (API_DESIGN §35, PRD §9.6)", () => {
  it("needs only a title; priority and status get their defaults", () => {
    expect(createTaskSchema.parse({ title: " Book the band " })).toEqual({
      title: "Book the band",
      priority: "MEDIUM",
      status: "TODO",
    });
  });

  it("accepts null for every optional reference and date", () => {
    expect(
      createTaskSchema.safeParse({
        title: "Band",
        description: null,
        assignedMembershipId: null,
        eventId: null,
        dueDate: null,
      }).success,
    ).toBe(true);
  });

  it("needs a due date with an offset and well-formed ids", () => {
    expect(
      issues(createTaskSchema, { title: "Band", dueDate: "2027-01-15", eventId: "x" }),
    ).toEqual([
      ["eventId", "Invalid id"],
      ["dueDate", "Choose a valid due date"],
    ]);
  });

  it("never accepts completedAt or weddingId", () => {
    expect(createTaskSchema.safeParse({ title: "Band", completedAt: null }).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "Band", weddingId: ID }).success).toBe(false);
  });
});

describe("updateTaskSchema (API_DESIGN §37)", () => {
  it("accepts one field, with or without the version, and adds no defaults", () => {
    expect(updateTaskSchema.parse({ status: "COMPLETED" })).toEqual({ status: "COMPLETED" });
    expect(updateTaskSchema.parse({ eventId: null, version: 2 })).toEqual({
      eventId: null,
      version: 2,
    });
  });

  it("needs something to change", () => {
    expect(issues(updateTaskSchema, { version: 0 })).toEqual([
      ["", "Send at least one field to change"],
    ]);
  });
});

describe("listTasksQuerySchema (API_DESIGN §34)", () => {
  it("pages from 1 with 20 per page and reads filters", () => {
    expect(listTasksQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(
      listTasksQuerySchema.parse({ eventId: "none", assignedMembershipId: ID, mine: "true" }),
    ).toEqual({ page: 1, limit: 20, eventId: "none", assignedMembershipId: ID, mine: true });
  });

  it("rejects unknown values", () => {
    for (const query of [{ status: "DONE" }, { mine: "1" }, { eventId: "all" }, { limit: "101" }]) {
      expect(listTasksQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});
