import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { REQUEST_PATH_HEADER } from "@/lib/safe-next";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

import { proxy } from "./proxy";

const request = (path: string, cookie = false) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=x` } : {},
  });

describe("proxy", () => {
  it("sends signed-out visitors to sign in, remembering the /app page", () => {
    const response = proxy(request("/app/settings/members?tab=1"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fapp%2Fsettings%2Fmembers%3Ftab%3D1",
    );
  });

  it("does not add next for the dashboard itself or Create Wedding", () => {
    expect(proxy(request("/app")).headers.get("location")).toBe("http://localhost:3000/login");
    expect(proxy(request("/create-wedding")).headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("lets a request with a session cookie through, telling the guard which page it was", () => {
    const response = proxy(request("/app/tasks", true));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)).toBe("/app/tasks");
  });
});
