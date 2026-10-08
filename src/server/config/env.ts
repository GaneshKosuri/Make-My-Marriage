import "server-only";

import { z } from "zod";

/**
 * Environment configuration, validated once with Zod on first use.
 *
 * Access is lazy (`getEnv()`), never at import time: `next build` imports
 * route modules with NODE_ENV=production and no runtime secrets.
 *
 * Integration keys are optional in development/test (console/fake adapters
 * take over) and required in production. Error messages name the variable,
 * never its value.
 */

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = () => z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());

const PRODUCTION_REQUIRED = [
  "MONGODB_URI",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "GOOGLE_PLACES_API_KEY",
] as const;

/** Database names that look like production must never be used outside production (SYSTEM_DESIGN §78). */
const PRODUCTION_LIKE_DB_NAME = /(^|[-_.])(prod|production)$/i;

export function databaseNameFromUri(uri: string): string | null {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const slash = withoutScheme.indexOf("/");
  if (slash === -1) return null;
  const name = withoutScheme.slice(slash + 1).split("?")[0] ?? "";
  return name ? decodeURIComponent(name) : null;
}

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    NEXT_PUBLIC_APP_URL: z.preprocess(
      emptyToUndefined,
      z
        .url({ protocol: /^https?$/, error: "must be an absolute http(s) URL" })
        .transform((value) => new URL(value).origin),
    ),

    MONGODB_URI: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .regex(/^mongodb(\+srv)?:\/\//, "must be a mongodb:// or mongodb+srv:// URI")
        .optional(),
    ),

    SESSION_SECRET: z.preprocess(
      emptyToUndefined,
      z
        .string({ error: "is required" })
        .refine((value) => Buffer.byteLength(value, "utf8") >= 32, "must be at least 32 bytes"),
    ),
    SESSION_TTL_DAYS: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(365).default(30),
    ),

    CRON_SECRET: z.preprocess(
      emptyToUndefined,
      z.string().min(32, "must be at least 32 characters").optional(),
    ),

    RESEND_API_KEY: optionalString(),
    EMAIL_FROM: optionalString(),
    EMAIL_BATCH_SIZE: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1).max(100).default(25),
    ),

    R2_ACCOUNT_ID: optionalString(),
    R2_ACCESS_KEY_ID: optionalString(),
    R2_SECRET_ACCESS_KEY: optionalString(),
    R2_BUCKET_NAME: optionalString(),

    GOOGLE_PLACES_API_KEY: optionalString(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
      for (const key of PRODUCTION_REQUIRED) {
        if (!env[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
        }
      }
      if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["NEXT_PUBLIC_APP_URL"],
          message: "must use https in production",
        });
      }
      return;
    }

    if (env.MONGODB_URI) {
      const dbName = databaseNameFromUri(env.MONGODB_URI);
      if (dbName && PRODUCTION_LIKE_DB_NAME.test(dbName)) {
        ctx.addIssue({
          code: "custom",
          path: ["MONGODB_URI"],
          message: `points at "${dbName}", which looks like a production database; development and tests must use a separate database`,
        });
      }
    }
  });

export type Env = z.output<typeof envSchema>;

export class EnvValidationError extends Error {
  override readonly name = "EnvValidationError";

  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${problems.join("\n  - ")}`);
  }
}

/** Pure parser (unit-testable). Throws EnvValidationError listing variable names only. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "(env)"} ${issue.message}`),
    );
  }
  return result.data;
}

let cachedEnv: Env | undefined;

/** Validated environment, parsed from process.env on first call. */
export function getEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}

/** Tests only: forget the cached env after changing process.env. */
export function resetEnvForTests(): void {
  cachedEnv = undefined;
}
