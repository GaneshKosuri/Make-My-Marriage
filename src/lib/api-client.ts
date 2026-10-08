/**
 * Typed fetch wrapper for the REST API (API_DESIGN §6–7). Client components
 * use it from TanStack Query hooks in `src/features/*`. Server Components
 * read through module services instead of calling the API over HTTP.
 */
import { isErrorCode, type ErrorCode } from "./error-codes";
import type { CursorPagination, PagePagination } from "./pagination";

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** An `{ error }` envelope returned by the API, surfaced as a typed exception. */
export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly status: number,
    readonly code: ErrorCode | "UNKNOWN_ERROR",
    message: string,
    readonly details?: Readonly<Record<string, string>>,
  ) {
    super(message);
  }
}

export function buildApiUrl(path: string, query?: QueryParams): string {
  if (!path.startsWith("/api/")) {
    throw new Error(`API paths must start with /api/ (got "${path}")`);
  }
  if (!query) return path;

  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null) continue;
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  const error = (payload as { error?: unknown } | undefined)?.error as
    { code?: unknown; message?: unknown; details?: unknown } | undefined;

  if (error && typeof error.message === "string") {
    return new ApiError(
      response.status,
      isErrorCode(error.code) ? error.code : "UNKNOWN_ERROR",
      error.message,
      error.details && typeof error.details === "object"
        ? (error.details as Record<string, string>)
        : undefined,
    );
  }

  return new ApiError(
    response.status,
    response.status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN_ERROR",
    "The request could not be completed.",
  );
}

async function request(path: string, options: ApiRequestOptions = {}): Promise<unknown> {
  const { method = "GET", query, body, signal, headers } = options;
  const hasBody = body !== undefined;

  // Network failures reject with the platform TypeError (and stay retryable).
  const response = await fetch(buildApiUrl(path, query), {
    method,
    signal,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined;

  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

/** Calls an endpoint returning `{ data }` and unwraps it. */
export async function apiFetch<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const payload = (await request(path, options)) as { data: T } | undefined;
  if (!payload || !("data" in payload)) {
    throw new ApiError(500, "INTERNAL_ERROR", "Unexpected response from the server.");
  }
  return payload.data;
}

/** Calls a page-paginated list endpoint (`{ data, pagination: { page, limit, total, totalPages } }`). */
export async function apiFetchPage<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<{ data: T[]; pagination: PagePagination }> {
  return (await request(path, options)) as { data: T[]; pagination: PagePagination };
}

/** Calls a cursor-paginated list endpoint (`{ data, pagination: { nextCursor } }`). */
export async function apiFetchCursorPage<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<{ data: T[]; pagination: CursorPagination }> {
  return (await request(path, options)) as { data: T[]; pagination: CursorPagination };
}

/** Calls an action endpoint returning `{ success: true }` or 204. */
export async function apiAction(path: string, options?: ApiRequestOptions): Promise<void> {
  await request(path, { method: "POST", ...options });
}
