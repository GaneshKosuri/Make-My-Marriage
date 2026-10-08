import "server-only";

import { DEFAULT_ERROR_MESSAGES, httpStatusFor, type ErrorCode } from "./error-codes";

export type ErrorDetails = Readonly<Record<string, string>>;

export interface AppErrorOptions {
  /** Per-field messages, e.g. `{ email: "Invalid email address" }` (API_DESIGN §7). */
  details?: ErrorDetails;
  /** Extra response headers, e.g. `Retry-After` for RATE_LIMITED. */
  headers?: Readonly<Record<string, string>>;
  /** Internal cause. Logged, never sent to the client. */
  cause?: unknown;
}

/**
 * An expected, user-facing failure. `route()` turns it into the documented
 * error envelope. The message must be safe to show to end users.
 */
export class AppError extends Error {
  override readonly name = "AppError";
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: ErrorDetails;
  readonly headers?: Readonly<Record<string, string>>;

  constructor(code: ErrorCode, message?: string, options: AppErrorOptions = {}) {
    super(message ?? DEFAULT_ERROR_MESSAGES[code], { cause: options.cause });
    this.code = code;
    this.httpStatus = httpStatusFor(code);
    this.details = options.details;
    this.headers = options.headers;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Scaffold stub marker: service bodies throw this until their phase lands.
 * `reference` points at the doc section that specifies the behaviour.
 */
export function notImplemented(reference: string): never {
  throw new AppError("NOT_IMPLEMENTED", `Not implemented yet — see ${reference}.`);
}
