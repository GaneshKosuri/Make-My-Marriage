import { describe, expect, it } from "vitest";

import { databaseNameFromUri, EnvValidationError, parseEnv, resolveEmailProvider } from "./env";

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

describe("Gmail sending settings", () => {
  it("accepts the address and app password, dropping the spaces Google shows", () => {
    const env = parseEnv({
      ...base,
      GMAIL_USER: " family@gmail.com ",
      GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop",
    });
    expect(env.GMAIL_USER).toBe("family@gmail.com");
    expect(env.GMAIL_APP_PASSWORD).toBe("abcdefghijklmnop");
  });

  it("treats blank settings as unset", () => {
    const env = parseEnv({ ...base, GMAIL_USER: "", GMAIL_APP_PASSWORD: "  " });
    expect(env.GMAIL_USER).toBeUndefined();
    expect(env.GMAIL_APP_PASSWORD).toBeUndefined();
  });

  it("needs both settings together, a real address and a 16-letter app password", () => {
    expect(problemsOf({ ...base, GMAIL_USER: "family@gmail.com" })).toEqual([
      "GMAIL_APP_PASSWORD must be set together with the other GMAIL_ setting",
    ]);
    expect(problemsOf({ ...base, GMAIL_APP_PASSWORD: "abcdefghijklmnop" })).toEqual([
      "GMAIL_USER must be set together with the other GMAIL_ setting",
    ]);
    expect(
      problemsOf({ ...base, GMAIL_USER: "family", GMAIL_APP_PASSWORD: "my-real-password" }),
    ).toEqual(
      expect.arrayContaining([
        "GMAIL_USER must be a Gmail address",
        "GMAIL_APP_PASSWORD must be the 16-letter Google app password",
      ]),
    );
  });

  it("never echoes the app password in errors", () => {
    const problems = problemsOf({ ...base, GMAIL_APP_PASSWORD: "secretpassword1234" });
    expect(problems.join(" ")).not.toContain("secretpassword1234");
  });
});

describe("EMAIL_PROVIDER", () => {
  const gmail = { GMAIL_USER: "family@gmail.com", GMAIL_APP_PASSWORD: "abcdefghijklmnop" };
  const resend = { RESEND_API_KEY: "re_123" };

  it("picks the sender it names, whatever else is configured", () => {
    expect(
      resolveEmailProvider(parseEnv({ ...base, ...gmail, ...resend, EMAIL_PROVIDER: "resend" })),
    ).toBe("resend");
    expect(
      resolveEmailProvider(parseEnv({ ...base, ...gmail, ...resend, EMAIL_PROVIDER: " Gmail " })),
    ).toBe("gmail");
    expect(
      resolveEmailProvider(parseEnv({ ...base, ...gmail, ...resend, EMAIL_PROVIDER: "console" })),
    ).toBe("console");
  });

  it("falls back to the first configured of Gmail, Resend, console when unset", () => {
    expect(
      resolveEmailProvider(parseEnv({ ...base, ...gmail, ...resend, EMAIL_PROVIDER: "" })),
    ).toBe("gmail");
    expect(resolveEmailProvider(parseEnv({ ...base, ...resend }))).toBe("resend");
    expect(resolveEmailProvider(parseEnv(base))).toBe("console");
  });

  it("needs the chosen sender's settings and a known name", () => {
    expect(problemsOf({ ...base, EMAIL_PROVIDER: "resend" })).toEqual([
      "RESEND_API_KEY is required when EMAIL_PROVIDER is resend",
    ]);
    expect(problemsOf({ ...base, ...resend, EMAIL_PROVIDER: "gmail" })).toEqual([
      "GMAIL_USER is required when EMAIL_PROVIDER is gmail",
      "GMAIL_APP_PASSWORD is required when EMAIL_PROVIDER is gmail",
    ]);
    expect(problemsOf({ ...base, EMAIL_PROVIDER: "sendgrid" })).toEqual([
      "EMAIL_PROVIDER must be gmail, resend or console",
    ]);
  });

  it("must really send in production: Gmail instead of a Resend key is fine, console is not", () => {
    const { RESEND_API_KEY: _resendKey, ...withoutResend } = production;
    expect(problemsOf({ ...withoutResend, ...gmail, EMAIL_PROVIDER: "gmail" })).toEqual([]);
    expect(problemsOf({ ...withoutResend, ...gmail })).toEqual([]);
    expect(problemsOf({ ...production, EMAIL_PROVIDER: "console" })).toEqual([
      "EMAIL_PROVIDER can't be console in production",
    ]);
    expect(problemsOf(withoutResend)).toContain("RESEND_API_KEY is required in production");
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
