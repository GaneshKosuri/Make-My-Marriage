/**
 * Pagination query schemas and envelope types (decision 6; API_DESIGN §88–90).
 * Isomorphic so module `*.schemas.ts` files can extend them. Server-side
 * helpers (skip/limit maths, cursor encoding) live in `@/server/http/pagination`.
 */
import { z } from "zod";

// Page-based lists: guests, tasks, expenses, vendors.
export const PAGE_DEFAULT_LIMIT = 20;
export const PAGE_MAX_LIMIT = 100;
export const PAGE_MAX = 100_000;

// Cursor lists: gallery photos (createdAt DESC, _id DESC).
export const CURSOR_DEFAULT_LIMIT = 24;
export const CURSOR_MAX_LIMIT = 48;
export const CURSOR_MAX_LENGTH = 512;

export const pageQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(PAGE_MAX).default(1),
    limit: z.coerce.number().int().min(1).max(PAGE_MAX_LIMIT).default(PAGE_DEFAULT_LIMIT),
  })
  .strict();

export const cursorQuerySchema = z
  .object({
    cursor: z
      .string()
      .min(1)
      .max(CURSOR_MAX_LENGTH)
      .regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor")
      .optional(),
    limit: z.coerce.number().int().min(1).max(CURSOR_MAX_LIMIT).default(CURSOR_DEFAULT_LIMIT),
  })
  .strict();

export type PageQuery = z.output<typeof pageQuerySchema>;
export type CursorQuery = z.output<typeof cursorQuerySchema>;

export interface PagePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CursorPagination {
  nextCursor: string | null;
  /** Filtered total, when the endpoint provides it (photos do; 2026-09-18 notes). */
  total?: number;
}

/** What list services return; route handlers wrap it with `paginated()`. */
export interface PageResult<T> {
  items: T[];
  pagination: PagePagination;
}

/** What cursor-list services return; route handlers wrap it with `cursorPaginated()`. */
export interface CursorResult<T> {
  items: T[];
  pagination: CursorPagination;
}
