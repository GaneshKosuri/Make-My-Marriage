import "server-only";

import { randomUUID } from "node:crypto";

import { unstable_rethrow } from "next/navigation";
import { connection, type NextRequest } from "next/server";
import type { z } from "zod";

import { authenticate } from "@/server/auth/authenticate";
import type { AuthLevel, ContextFor } from "@/server/auth/types";
import { AppError, isAppError, type ErrorCode } from "@/server/errors";
import { logger, sanitizePath } from "@/server/logging/logger";
import { getRateLimiter, type RateLimitPolicy } from "@/server/security/rate-limit";

import { MAX_JSON_BODY_BYTES, readJsonBody } from "./body";
import { getClientIp } from "./client-ip";
import { assertSameOrigin } from "./origin";
import { errorResponse } from "./responses";
import { zodErrorToDetails, type ValidationSource } from "./validation";

/**
 * The single route-handler factory. Every `src/app/api/**\/route.ts` export
 * goes through it:
 *
 *   export const PATCH = route({
 *     auth: "member",
 *     params: z.object({ taskId: objectId }).strict(),
 *     body: updateTaskSchema,
 *     handler: async ({ ctx, params, body }) =>
 *       ok(await tasksService.update(ctx, params.taskId, body)),
 *   });
 *
 * Pipeline, in order:
 *   1. assign a request id
 *   2. mutations (except `internal`): Origin must equal NEXT_PUBLIC_APP_URL
 *   3. resolve the auth level → ctx
 *   4. read the JSON body (only when `body` is configured), capped at 8 KiB
 *   5. validate params, query and body with Zod → VALIDATION_ERROR + details
 *   6. apply rate limits, if configured
 *   7. run the handler
 * AppErrors become the documented error envelope; anything else becomes a
 * generic 500 (logged with the request id, never leaked). Every response gets
 * `Cache-Control: no-store` and `x-request-id`.
 */

type AnySchema = z.ZodType;
type Parsed<S> = S extends z.ZodType ? z.output<S> : undefined;

export type InvalidParamsError = Extract<
  ErrorCode,
  "VALIDATION_ERROR" | "NOT_FOUND" | "INVALID_TOKEN"
>;

export interface HandlerArgs<A extends AuthLevel, P, Q, B> {
  ctx: ContextFor<A>;
  params: Parsed<P>;
  query: Parsed<Q>;
  body: Parsed<B>;
  request: NextRequest;
}

export interface RouteConfig<
  A extends AuthLevel,
  P extends AnySchema | undefined,
  Q extends AnySchema | undefined,
  B extends AnySchema | undefined,
> {
  auth: A;
  params?: P;
  query?: Q;
  body?: B;
  /** One policy, or several consumed in order (first rejection stops the rest). */
  rateLimit?: RateLimitPolicy | readonly RateLimitPolicy[];
  /**
   * Error for malformed path params. Default VALIDATION_ERROR (API_DESIGN §95).
   * Public token/slug routes use NOT_FOUND so malformed and unknown links are
   * indistinguishable (API_DESIGN §50); member-invitation accept uses INVALID_TOKEN (§26).
   */
  invalidParams?: InvalidParamsError;
  handler: (args: HandlerArgs<A, P, Q, B>) => Response | Promise<Response>;
}

export interface RouteMetadata {
  readonly auth: AuthLevel;
  readonly rateLimits: readonly string[];
}

export interface RouteHandlerContext {
  params: Promise<unknown>;
}

export type RouteHandler = ((
  request: NextRequest,
  context?: RouteHandlerContext,
) => Promise<Response>) & { readonly metadata: RouteMetadata };

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function route<
  A extends AuthLevel,
  P extends AnySchema | undefined = undefined,
  Q extends AnySchema | undefined = undefined,
  B extends AnySchema | undefined = undefined,
>(config: RouteConfig<A, P, Q, B>): RouteHandler {
  const rateLimits: readonly RateLimitPolicy[] =
    config.rateLimit === undefined
      ? []
      : Array.isArray(config.rateLimit)
        ? config.rateLimit
        : [config.rateLimit as RateLimitPolicy];

  const handle = async (request: NextRequest, context?: RouteHandlerContext) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    let identity: { userId?: string; weddingId?: string } = {};
    let errorCode: string | undefined;
    let response: Response;

    try {
      // API responses are always per request: never prerender them.
      await connection();

      if (MUTATION_METHODS.has(request.method) && config.auth !== "internal") {
        assertSameOrigin(request);
      }

      const ctx = await authenticate(config.auth, request, requestId);
      identity = {
        userId: "userId" in ctx ? ctx.userId : undefined,
        weddingId: "weddingId" in ctx ? ctx.weddingId : undefined,
      };

      const rawBody = config.body ? await readJsonBody(request, MAX_JSON_BODY_BYTES) : undefined;
      const rawParams = ((await context?.params) ?? {}) as Record<string, unknown>;

      const params = config.params
        ? parseParams(config.params, rawParams, config.invalidParams ?? "VALIDATION_ERROR")
        : undefined;

      const details: Record<string, string> = {};
      const query = config.query
        ? collect(
            config.query,
            searchParamsToObject(request.nextUrl.searchParams),
            "query",
            details,
          )
        : undefined;
      const body = config.body ? collect(config.body, rawBody, "body", details) : undefined;
      if (Object.keys(details).length > 0) {
        throw new AppError("VALIDATION_ERROR", undefined, { details });
      }

      if (rateLimits.length > 0) {
        await getRateLimiter().enforce(
          rateLimits.map((policy) => ({
            policy,
            subject: rateLimitSubject(policy, request, ctx, rawParams),
          })),
        );
      }

      response = await config.handler({
        ctx,
        params,
        query,
        body,
        request,
      } as HandlerArgs<A, P, Q, B>);
    } catch (error) {
      // Let Next.js control flow (redirect/notFound/prerender bail-outs) through.
      unstable_rethrow(error);
      errorCode = isAppError(error) ? error.code : "INTERNAL_ERROR";
      response = toErrorResponse(error, requestId);
    }

    response = withHeaders(response, {
      "Cache-Control": "no-store",
      "x-request-id": requestId,
    });

    logRequest(request, response.status, {
      requestId,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode,
      ...identity,
    });
    return response;
  };

  return Object.assign(handle, {
    metadata: { auth: config.auth, rateLimits: rateLimits.map((policy) => policy.name) },
  });
}

function parseParams(
  schema: AnySchema,
  raw: Record<string, unknown>,
  onInvalid: InvalidParamsError,
): unknown {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  if (onInvalid !== "VALIDATION_ERROR") throw new AppError(onInvalid);
  throw new AppError("VALIDATION_ERROR", undefined, {
    details: zodErrorToDetails(result.error, "params"),
  });
}

function collect(
  schema: AnySchema,
  raw: unknown,
  source: ValidationSource,
  details: Record<string, string>,
): unknown {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  Object.assign(details, zodErrorToDetails(result.error, source));
  return undefined;
}

/** Repeated keys become arrays; single keys stay strings. */
export function searchParamsToObject(
  searchParams: URLSearchParams,
): Record<string, string | string[]> {
  const output: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    output[key] = values.length > 1 ? values : (values[0] ?? "");
  }
  return output;
}

function rateLimitSubject(
  policy: RateLimitPolicy,
  request: NextRequest,
  ctx: object,
  rawParams: Record<string, unknown>,
): string {
  const context = ctx as Partial<Record<"userId" | "membershipId" | "weddingId", string>>;
  let subject: string | undefined;
  switch (policy.scope) {
    case "ip":
      subject = getClientIp(request);
      break;
    case "global":
      subject = "global";
      break;
    case "token":
      subject = typeof rawParams.token === "string" ? rawParams.token : undefined;
      break;
    case "user":
      subject = context.userId;
      break;
    case "membership":
      subject = context.membershipId;
      break;
    case "wedding":
      subject = context.weddingId;
      break;
  }
  if (!subject) {
    throw new Error(`Rate-limit policy "${policy.name}" (${policy.scope}) does not fit this route`);
  }
  return subject;
}

function toErrorResponse(error: unknown, requestId: string): Response {
  if (isAppError(error)) {
    if (error.httpStatus >= 500 && error.code !== "NOT_IMPLEMENTED") {
      logger.error("Request failed", { requestId, errorCode: error.code, error });
    }
    return errorResponse(error);
  }
  // Unknown failure: log internally, return a generic envelope (no stack, no message).
  logger.error("Unhandled error in route handler", { requestId, error });
  return errorResponse(new AppError("INTERNAL_ERROR"));
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
  try {
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  } catch {
    // e.g. Response.redirect() has immutable headers: copy into a mutable response.
    const copy = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers)) copy.headers.set(key, value);
    return copy;
  }
}

function logRequest(
  request: NextRequest,
  status: number,
  fields: {
    requestId: string;
    durationMs: number;
    errorCode?: string;
    userId?: string;
    weddingId?: string;
  },
): void {
  const entry = {
    ...fields,
    method: request.method,
    // Token segments are replaced and the query string dropped (API_DESIGN §104).
    route: sanitizePath(request.nextUrl.pathname),
    status,
  };
  if (status >= 500 && status !== 501) logger.error("api request", entry);
  else logger.info("api request", entry);
}
