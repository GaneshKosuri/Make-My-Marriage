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

/** Email senders `EMAIL_PROVIDER` can pick. */
export const EMAIL_PROVIDERS = ["gmail", "resend", "console"] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

/**
 * What production needs to start. RESEND_API_KEY is required only when Resend
 * is the sender (see below). R2 (photos, covers: Phases 5–6) and Google Places
 * (vendor discovery: Phase 4) are not required until their features ship: their
 * services refuse to run in production without them instead (decided 2026-11-11).
 */
const PRODUCTION_REQUIRED = ["MONGODB_URI", "CRON_SECRET", "EMAIL_FROM"] as const;

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
    /**
     * Which sender delivers email: gmail, resend or console. Unset: Gmail when
     * GMAIL_* are set, else Resend when RESEND_API_KEY is set, else console.
     */
    EMAIL_PROVIDER: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() || undefined : value),
      z.enum(EMAIL_PROVIDERS, { error: "must be gmail, resend or console" }).optional(),
    ),
    /**
     * Gmail sending (no domain needed): the Gmail address and a Google app
     * password. Set both or neither.
     */
    GMAIL_USER: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() || undefined : value),
      z.email({ error: "must be a Gmail address" }).optional(),
    ),
    /** Google shows it as four groups of four letters; the spaces are dropped. */
    GMAIL_APP_PASSWORD: z.preprocess(
      (value) => (typeof value === "string" ? value.replace(/\s+/g, "") || undefined : value),
      z
        .string()
        .regex(/^[a-z]{16}$/i, "must be the 16-letter Google app password")
        .optional(),
    ),
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
    if (Boolean(env.GMAIL_USER) !== Boolean(env.GMAIL_APP_PASSWORD)) {
      ctx.addIssue({
        code: "custom",
        path: [env.GMAIL_USER ? "GMAIL_APP_PASSWORD" : "GMAIL_USER"],
        message: "must be set together with the other GMAIL_ setting",
      });
    }

    // A sender picked by EMAIL_PROVIDER must have its settings.
    if (env.EMAIL_PROVIDER === "gmail" && !env.GMAIL_USER && !env.GMAIL_APP_PASSWORD) {
      for (const key of ["GMAIL_USER", "GMAIL_APP_PASSWORD"] as const) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "is required when EMAIL_PROVIDER is gmail",
        });
      }
    }
    if (env.EMAIL_PROVIDER === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "is required when EMAIL_PROVIDER is resend",
      });
    }

    if (env.NODE_ENV === "production") {
      // Production must really send: the console sender only prints.
      if (env.EMAIL_PROVIDER === "console") {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_PROVIDER"],
          message: "can't be console in production",
        });
      } else if (!env.EMAIL_PROVIDER && resolveEmailProvider(env) === "console") {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "is required in production",
        });
      }
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

/**
 * The email sender in use: EMAIL_PROVIDER when set, otherwise the first one
 * configured of Gmail, then Resend, then the console (development only).
 */
export function resolveEmailProvider(
  env: Pick<Env, "EMAIL_PROVIDER" | "GMAIL_USER" | "GMAIL_APP_PASSWORD" | "RESEND_API_KEY">,
): EmailProvider {
  if (env.EMAIL_PROVIDER) return env.EMAIL_PROVIDER;
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) return "gmail";
  return env.RESEND_API_KEY ? "resend" : "console";
}

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
