import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { cursorQuerySchema, pageQuerySchema } from "@/lib/pagination";
import { AppError } from "@/server/errors";

import {
  afterCursorFilter,
  buildPagePagination,
  decodeCursor,
  encodeCursor,
  pageSkip,
  sliceCursorPage,
} from "./pagination";

describe("page pagination (decision 6)", () => {
  it("defaults to page 1, limit 20 and caps limit at 100 / page at 100000", () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
    expect(pageQuerySchema.parse({ page: "3", limit: "50" })).toEqual({ page: 3, limit: 50 });
    expect(pageQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ page: "100001" }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(pageQuerySchema.safeParse({ extra: "x" }).success).toBe(false); // strict
  });

  it("computes skip and envelope", () => {
    expect(pageSkip({ page: 3, limit: 20 })).toBe(40);
    expect(buildPagePagination(186, { page: 1, limit: 50 })).toEqual({
      page: 1,
      limit: 50,
      total: 186,
      totalPages: 4,
    });
  });
});

describe("cursor pagination (photos)", () => {
  it("defaults to 24 and caps at 48", () => {
    expect(cursorQuerySchema.parse({})).toEqual({ limit: 24 });
    expect(cursorQuerySchema.safeParse({ limit: "49" }).success).toBe(false);
  });

  it("round-trips an opaque cursor", () => {
    const position = {
      createdAt: new Date("2027-02-14T10:00:00.000Z"),
      id: new Types.ObjectId().toString(),
      scope: "event:abc",
    };
    const cursor = encodeCursor(position);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor, "event:abc")).toEqual(position);
  });

  it("rejects tampered cursors and scope changes with VALIDATION_ERROR", () => {
    const cursor = encodeCursor({ createdAt: new Date(), id: new Types.ObjectId().toString() });
    for (const bad of ["not-base64-json", Buffer.from('{"c":"x","i":"y"}').toString("base64url")]) {
      expect(() => decodeCursor(bad)).toThrow(AppError);
    }
    expect(() => decodeCursor(cursor, "event:other")).toThrow(AppError);
  });

  it("builds a (createdAt DESC, _id DESC) continuation filter", () => {
    const id = new Types.ObjectId();
    const createdAt = new Date();
    expect(afterCursorFilter({ createdAt, id: id.toString() })).toEqual({
      $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: id } }],
    });
  });

  it("slices limit+1 rows into a page and next cursor", () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      _id: new Types.ObjectId(),
      createdAt: new Date(Date.UTC(2027, 1, 14 - i)),
    }));
    const page = sliceCursorPage(rows, 2);
    expect(page.items).toHaveLength(2);
    expect(decodeCursor(page.nextCursor ?? "").id).toBe(rows[1]?._id.toString());
    expect(sliceCursorPage(rows, 3).nextCursor).toBeNull();
  });
});
