import "server-only";

import { NextResponse } from "next/server";

import type { CursorPagination, PagePagination } from "@/lib/pagination";
import { AppError } from "@/server/errors";

/**
 * Response envelopes (API_DESIGN §6–7):
 *   single resource  { data }
 *   page list        { data: [], pagination: { page, limit, total, totalPages } }
 *   cursor list      { data: [], pagination: { nextCursor } }
 *   action           { success: true }
 *   error            { error: { code, message, details? } }
 */

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, { status: 201, ...init });
}

export function paginated<T>(data: readonly T[], pagination: PagePagination): NextResponse {
  return NextResponse.json({ data, pagination }, { status: 200 });
}

export function cursorPaginated<T>(data: readonly T[], pagination: CursorPagination): NextResponse {
  return NextResponse.json({ data, pagination }, { status: 200 });
}

export function success(init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true }, { status: 200, ...init });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(error: AppError): NextResponse {
  const body = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
  return NextResponse.json(body, { status: error.httpStatus, headers: error.headers });
}

/** Scaffold stub response: 501 NOT_IMPLEMENTED naming the delivery phase. */
export function notImplemented(phaseLabel: string): NextResponse {
  return errorResponse(
    new AppError("NOT_IMPLEMENTED", `Not implemented yet (${phaseLabel}).`, {
      details: { phase: phaseLabel },
    }),
  );
}
