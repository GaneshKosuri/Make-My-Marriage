import "server-only";

import { Types } from "mongoose";

import { isObjectIdString } from "@/lib/object-id";
import type { PagePagination, PageQuery } from "@/lib/pagination";
import { AppError } from "@/server/errors";

export {
  CURSOR_DEFAULT_LIMIT,
  CURSOR_MAX_LIMIT,
  cursorQuerySchema,
  PAGE_DEFAULT_LIMIT,
  PAGE_MAX,
  PAGE_MAX_LIMIT,
  pageQuerySchema,
  type CursorPagination,
  type CursorQuery,
  type PagePagination,
  type PageQuery,
} from "@/lib/pagination";

// ── Page-based (guests, tasks, expenses, vendors) ────────────────────────────

export function pageSkip({ page, limit }: PageQuery): number {
  return (page - 1) * limit;
}

export function buildPagePagination(total: number, { page, limit }: PageQuery): PagePagination {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// ── Cursor (photos): createdAt DESC, _id DESC ────────────────────────────────

export interface CursorPosition {
  createdAt: Date;
  id: string;
  /**
   * Optional scope the cursor was issued for (e.g. the active event filter).
   * A cursor replayed with a different scope is rejected.
   */
  scope?: string;
}

interface EncodedCursor {
  c: string;
  i: string;
  s?: string;
}

/** Opaque cursor: base64url(JSON). Clients must treat it as a black box. */
export function encodeCursor({ createdAt, id, scope }: CursorPosition): string {
  const payload: EncodedCursor = {
    c: createdAt.toISOString(),
    i: id,
    ...(scope ? { s: scope } : {}),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function invalidCursor(): AppError {
  return new AppError("VALIDATION_ERROR", undefined, {
    details: { "query.cursor": "Invalid cursor" },
  });
}

export function decodeCursor(cursor: string, expectedScope?: string): CursorPosition {
  let payload: Partial<EncodedCursor>;
  try {
    payload = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<EncodedCursor>;
  } catch {
    throw invalidCursor();
  }

  const createdAt = typeof payload.c === "string" ? new Date(payload.c) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime()) || !isObjectIdString(payload.i)) {
    throw invalidCursor();
  }
  if ((payload.s ?? undefined) !== (expectedScope ?? undefined)) throw invalidCursor();

  return { createdAt, id: payload.i, scope: payload.s };
}

/** Mongo filter for "strictly after this cursor" in (createdAt DESC, _id DESC) order. */
export function afterCursorFilter({ createdAt, id }: CursorPosition): Record<string, unknown> {
  return {
    $or: [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: new Types.ObjectId(id) } }],
  };
}

/**
 * Given rows fetched with `limit + 1`, returns the page and the next cursor
 * (null on the last page).
 */
export function sliceCursorPage<T extends { createdAt: Date; _id: { toString(): string } }>(
  rows: readonly T[],
  limit: number,
  scope?: string,
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({ createdAt: last.createdAt, id: last._id.toString(), scope })
      : null;
  return { items, nextCursor };
}
