import { describe, expect, it } from "vitest";

import { databaseNameFromUri, EnvValidationError, parseEnv } from "./env";

const SECRET = "x".repeat(32);

const base = {
  NODE_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  SESSION_SECRET: SECRET,
};

const production = {
  NODE_ENV: "production",
  NEXT_PUBLIC_APP_URL: "https://makemymarriage.com",
  MONGODB_URI: "mongodb+srv://user:pass@cluster.example.net/make-my-marriage",
  SESSION_SECRET: SECRET,
  CRON_SECRET: "c".repeat(32),
  RESEND_API_KEY: "re_123",
  EMAIL_FROM: "Make My Marriage <noreply@makemymarriage.com>",
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "key",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET_NAME: "bucket",
  GOOGLE_PLACES_API_KEY: "places",
};

function problemsOf(source: Record<string, string | undefined>): string[] {
  try {
    parseEnv(source);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(EnvValidationError);
    return [...(error as EnvValidationError).problems];
  }
}

describe("parseEnv", () => {
  it("accepts a minimal development environment and applies defaults", () => {
    const env = parseEnv(base);
    expect(env.SESSION_TTL_DAYS).toBe(30);
    expect(env.EMAIL_BATCH_SIZE).toBe(25);
    expect(env.MONGODB_URI).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("normalises NEXT_PUBLIC_APP_URL to an origin", () => {
    const env = parseEnv({ ...base, NEXT_PUBLIC_APP_URL: "http://localhost:3000/some/path" });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("treats empty strings as unset", () => {
    const env = parseEnv({
      ...base,
      RESEND_API_KEY: "",
      SESSION_TTL_DAYS: "",
      EMAIL_BATCH_SIZE: " ",
    });
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.SESSION_TTL_DAYS).toBe(30);
    expect(env.EMAIL_BATCH_SIZE).toBe(25);
  });

  it("requires a session secret of at least 32 bytes", () => {
    expect(problemsOf({ ...base, SESSION_SECRET: undefined })).toEqual([
      expect.stringContaining("SESSION_SECRET"),
    ]);
    expect(problemsOf({ ...base, SESSION_SECRET: "short" })).toEqual([
      expect.stringMatching(/SESSION_SECRET.*32 bytes/),
    ]);
  });

  it("coerces and bounds numeric settings", () => {
    expect(parseEnv({ ...base, SESSION_TTL_DAYS: "7", EMAIL_BATCH_SIZE: "50" })).toMatchObject({
      SESSION_TTL_DAYS: 7,
      EMAIL_BATCH_SIZE: 50,
    });
    expect(problemsOf({ ...base, EMAIL_BATCH_SIZE: "0" })).toEqual([
      expect.stringContaining("EMAIL_BATCH_SIZE"),
    ]);
  });

  it("requires every integration key in production", () => {
    expect(problemsOf(production)).toEqual([]);
    const problems = problemsOf({ ...production, RESEND_API_KEY: undefined, R2_BUCKET_NAME: "" });
    expect(problems).toEqual([
      "RESEND_API_KEY is required in production",
      "R2_BUCKET_NAME is required in production",
    ]);
  });

  it("requires https in production", () => {
    expect(problemsOf({ ...production, NEXT_PUBLIC_APP_URL: "http://makemymarriage.com" })).toEqual(
      [expect.stringContaining("https")],
    );
  });

  it("rejects production-looking databases outside production", () => {
    expect(
      problemsOf({ ...base, MONGODB_URI: "mongodb://localhost:27017/make-my-marriage-prod" }),
    ).toEqual([expect.stringContaining("production database")]);
    expect(
      parseEnv({ ...base, MONGODB_URI: "mongodb://localhost:27017/mmm-dev" }).MONGODB_URI,
    ).toBe("mongodb://localhost:27017/mmm-dev");
  });

  it("never echoes secret values in error messages", () => {
    const problems = problemsOf({ ...base, SESSION_SECRET: "tiny-secret-value" });
    expect(problems.join(" ")).not.toContain("tiny-secret-value");
  });
});

describe("databaseNameFromUri", () => {
  it("extracts the database name", () => {
    expect(databaseNameFromUri("mongodb://h:1/db-name?replicaSet=rs0")).toBe("db-name");
    expect(databaseNameFromUri("mongodb+srv://u:p@c.example.net/prod")).toBe("prod");
    expect(databaseNameFromUri("mongodb://h:1/")).toBeNull();
    expect(databaseNameFromUri("mongodb://h:1")).toBeNull();
  });
});
