import { describe, expect, it } from "vitest";

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./auth.schemas";

const signup = { name: "Akshay Saini", email: "akshay@example.com", password: "12345678" };

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe("auth schemas (API_DESIGN §11–16)", () => {
  it("accepts a valid signup and trims name and email, never the password", () => {
    expect(
      signupSchema.parse({
        name: "  Akshay  ",
        email: " akshay@example.com ",
        password: " pass word ",
      }),
    ).toEqual({ name: "Akshay", email: "akshay@example.com", password: " pass word " });
  });

  it("requires a name, a valid email and a password of at least 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "  ",
      email: "not-an-email",
      password: "1234567",
    });
    expect(messages(result)).toEqual([
      "Enter your full name",
      "Enter a valid email address",
      "Password must be at least 8 characters",
    ]);
    expect(signupSchema.safeParse(signup).success).toBe(true);
  });

  it("caps password length so hashing cost stays bounded", () => {
    expect(signupSchema.safeParse({ ...signup, password: "x".repeat(129) }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, password: "x".repeat(128) }).success).toBe(true);
  });

  it.each([
    ["signup", signupSchema, signup],
    ["login", loginSchema, { email: "a@example.com", password: "x" }],
    ["forgot-password", forgotPasswordSchema, { email: "a@example.com" }],
    ["reset-password", resetPasswordSchema, { token: "t", password: "12345678" }],
  ] as const)(
    "%s is strict: unknown keys such as weddingId are rejected",
    (_name, schema, valid) => {
      expect(schema.safeParse(valid).success).toBe(true);
      expect(schema.safeParse({ ...valid, weddingId: "665f1c2b9d3e4a0012345678" }).success).toBe(
        false,
      );
    },
  );

  it("login only requires a password to be present (old accounts may predate rules)", () => {
    expect(messages(loginSchema.safeParse({ email: "a@example.com", password: "" }))).toEqual([
      "Enter your password",
    ]);
  });
});
