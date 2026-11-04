import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  createEventSchema,
  endsBeforeStart,
  listEventsQuerySchema,
  updateEventSchema,
} from "./event.schemas";

const valid = { name: "Mehendi", startsAt: "2027-02-12T10:30:00.000Z" };

/** [path, message] pairs, e.g. ["endsAt", "End the event after it starts"]. */
const issues = (schema: z.ZodType, input: unknown) =>
  schema.safeParse(input).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ?? [];

describe("createEventSchema (API_DESIGN §30, PRD §9.5)", () => {
  it("needs only a name and start", () => {
    expect(createEventSchema.parse(valid)).toEqual(valid);
  });

  it("accepts instants with Z or an explicit offset only", () => {
    expect(
      createEventSchema.safeParse({ ...valid, startsAt: "2027-02-12T16:00:00+05:30" }).success,
    ).toBe(true);
    expect(issues(createEventSchema, { ...valid, startsAt: "2027-02-12T10:30:00" })).toEqual([
      ["startsAt", "Choose when the event starts"],
    ]);
  });

  it("keeps the end strictly after the start", () => {
    expect(issues(createEventSchema, { ...valid, endsAt: valid.startsAt })).toEqual([
      ["endsAt", "End the event after it starts"],
    ]);
    expect(createEventSchema.safeParse({ ...valid, endsAt: null }).success).toBe(true);
  });

  it("rejects unknown fields such as weddingId", () => {
    expect(createEventSchema.safeParse({ ...valid, weddingId: "abc" }).success).toBe(false);
  });
});

describe("updateEventSchema (API_DESIGN §32)", () => {
  it("accepts any one field, with or without the version", () => {
    expect(updateEventSchema.parse({ dressCode: "" })).toEqual({ dressCode: "" });
    expect(updateEventSchema.parse({ endsAt: null, version: 3 })).toEqual({
      endsAt: null,
      version: 3,
    });
  });

  it("needs something to change", () => {
    expect(issues(updateEventSchema, {})).toEqual([["", "Send at least one field to change"]]);
    expect(issues(updateEventSchema, { version: 1 })).toEqual([
      ["", "Send at least one field to change"],
    ]);
  });

  it("does not allow clearing the name or start", () => {
    expect(updateEventSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateEventSchema.safeParse({ startsAt: null }).success).toBe(false);
  });
});

describe("listEventsQuerySchema (API_DESIGN §29)", () => {
  it("leaves archived events out by default", () => {
    expect(listEventsQuerySchema.parse({})).toEqual({ includeArchived: false });
    expect(listEventsQuerySchema.parse({ includeArchived: "true" })).toEqual({
      includeArchived: true,
    });
  });

  it("needs `to` after `from`", () => {
    expect(
      issues(listEventsQuerySchema, { from: "2027-02-12T00:00:00Z", to: "2027-02-12T00:00:00Z" }),
    ).toEqual([["to", "Must be after from"]]);
  });
});

describe("endsBeforeStart", () => {
  it("is true only when an end is set at or before the start", () => {
    expect(endsBeforeStart(valid.startsAt, null)).toBe(false);
    expect(endsBeforeStart(valid.startsAt, "2027-02-12T11:00:00Z")).toBe(false);
    expect(endsBeforeStart(valid.startsAt, "2027-02-12T16:00:00+05:30")).toBe(true);
  });
});
