import "server-only";

/**
 * Structured JSON logger (SYSTEM_DESIGN §62, API_DESIGN §104).
 *
 * Never logged: passwords, session/reset tokens, member-invite, guest-invite or
 * gallery tokens, signed R2 URLs. Defences:
 *   1. Keys that look secret are redacted recursively.
 *   2. String values that look like presigned URLs are redacted.
 *   3. Token-bearing paths are logged with the token segment replaced.
 *   4. Query strings are dropped from logged paths.
 */

type Level = "debug" | "info" | "warn" | "error";

export interface LogFields {
  requestId?: string;
  method?: string;
  route?: string;
  status?: number;
  userId?: string;
  weddingId?: string;
  durationMs?: number;
  errorCode?: string;
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minimumLevel(): number {
  switch (process.env.NODE_ENV) {
    case "production":
      return LEVEL_ORDER.info;
    case "test":
      return LEVEL_ORDER.error;
    default:
      return LEVEL_ORDER.debug;
  }
}

// Any key ending in "url" is redacted too: signed R2 URLs and token-bearing
// share links (invitation/gallery URLs) both travel in `*Url` fields.
const SECRET_KEY_PATTERN =
  /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|signature|url$/i;
const SIGNED_URL_PATTERN = /X-Amz-(Signature|Credential|Security-Token)=/i;
const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

const TOKEN_PATH_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/(invite|gallery|join|reset-password)\/[^/]+/, "/$1/[token]"],
  [/^\/api\/public\/(invitations|galleries|member-invitations)\/[^/]+/, "/api/public/$1/[token]"],
  [/^\/api\/member-invitations\/[^/]+/, "/api/member-invitations/[token]"],
];

/** Drops the query string and replaces token path segments: `/invite/abc` → `/invite/[token]`. */
export function sanitizePath(pathOrUrl: string): string {
  let path = pathOrUrl;
  try {
    path = new URL(pathOrUrl, "http://internal.invalid").pathname;
  } catch {
    path = pathOrUrl.split(/[?#]/)[0] ?? "";
  }
  for (const [pattern, replacement] of TOKEN_PATH_RULES) {
    if (pattern.test(path)) return path.replace(pattern, replacement);
  }
  return path;
}

function serializeError(error: Error, depth: number): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: redactValue(error.message, depth + 1),
  };
  if (process.env.NODE_ENV !== "production" && error.stack) {
    serialized.stack = redactValue(error.stack, depth + 1);
  }
  if ("code" in error && error.code !== undefined) serialized.code = error.code;
  if (error.cause !== undefined) serialized.cause = redactValue(error.cause, depth + 1);
  return serialized;
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[Truncated]";
  if (typeof value === "string") {
    return SIGNED_URL_PATTERN.test(value) ? "[REDACTED_SIGNED_URL]" : value;
  }
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Error) return serializeError(value, depth);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    output[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactValue(inner, depth + 1);
  }
  return output;
}

/** Recursively redacts secret-looking keys and presigned URLs. Exported for tests. */
export function redact(fields: LogFields): Record<string, unknown> {
  return redactValue(fields, 0) as Record<string, unknown>;
}

function write(level: Level, message: string, fields: LogFields = {}): void {
  if (LEVEL_ORDER[level] < minimumLevel()) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...redact(fields),
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};

export type Logger = typeof logger;
