import { describe, expect, it } from "vitest";

import { safeNextPath, signInPathFor } from "./safe-next";

describe("safeNextPath", () => {
  it.each([
    ["/app", "/app"],
    ["/app/settings/members", "/app/settings/members"],
    ["/app/tasks?mine=true#top", "/app/tasks?mine=true#top"],
  ])("accepts the same-origin /app path %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    null,
    "",
    "https://evil.example",
    "//evil.example/app",
    "/\\evil.example",
    "/app\\..\\login",
    "/apple",
    "/login",
    "/app/../login",
    "/app/%2e%2e/login",
    "/app\n/x",
    "javascript:alert(1)",
  ])("refuses %s", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe("signInPathFor", () => {
  it("adds next only for a page worth returning to", () => {
    expect(signInPathFor("/app/settings/members")).toBe("/login?next=%2Fapp%2Fsettings%2Fmembers");
    expect(signInPathFor("/app")).toBe("/login");
    expect(signInPathFor("/create-wedding")).toBe("/login");
    expect(signInPathFor(null)).toBe("/login");
  });
});
