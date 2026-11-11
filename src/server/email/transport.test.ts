import { describe, expect, it, vi } from "vitest";

vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: vi.fn() }) } }));

import { parseEnv } from "@/server/config/env";

import { gmailFrom, selectEmailTransport } from "./index";

const base = {
  NODE_ENV: "development",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  SESSION_SECRET: "x".repeat(32),
};
const gmail = { GMAIL_USER: "family@gmail.com", GMAIL_APP_PASSWORD: "abcdefghijklmnop" };

describe("selectEmailTransport", () => {
  it("prefers Gmail when it is set up, even with a Resend key", () => {
    const transport = selectEmailTransport(
      parseEnv({
        ...base,
        ...gmail,
        RESEND_API_KEY: "re_123",
        EMAIL_FROM: "Make My Marriage <onboarding@resend.dev>",
      }),
    );
    expect(transport.adapter.name).toBe("gmail");
    expect(transport.from).toBe("Make My Marriage <family@gmail.com>");
  });

  it("uses Resend with a key and no Gmail, and the console with neither", () => {
    const resend = selectEmailTransport(
      parseEnv({ ...base, RESEND_API_KEY: "re_123", EMAIL_FROM: "MMM <noreply@mmm.in>" }),
    );
    expect(resend).toMatchObject({ adapter: { name: "resend" }, from: "MMM <noreply@mmm.in>" });
    expect(selectEmailTransport(parseEnv(base)).adapter.name).toBe("console");
  });
});

describe("gmailFrom", () => {
  it("keeps EMAIL_FROM's display name with the Gmail address", () => {
    expect(gmailFrom('"Akshay & Princi" <hello@example.com>', "family@gmail.com")).toBe(
      "Akshay & Princi <family@gmail.com>",
    );
    expect(gmailFrom("noreply@example.com", "family@gmail.com")).toBe(
      "Make My Marriage <family@gmail.com>",
    );
    expect(gmailFrom(undefined, "family@gmail.com")).toBe("Make My Marriage <family@gmail.com>");
  });
});
