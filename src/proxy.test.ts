import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { REQUEST_PATH_HEADER } from "@/lib/safe-next";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

import { proxy, WEBSITE_NOT_FOUND_PATH, websiteGate } from "./proxy";

const isPublished = vi.fn<(slug: string) => Promise<boolean>>();
vi.mock("@/modules/weddings", () => ({ websiteService: { isPublished } }));

const request = (path: string, cookie = false) =>
  new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie: `${SESSION_COOKIE_NAME}=x` } : {},
  });

/** Where a rewrite points, or null when the request goes through unchanged. */
const rewrittenTo = (response: Response) => response.headers.get("x-middleware-rewrite");

beforeEach(() => isPublished.mockReset());

describe("proxy", () => {
  it("sends signed-out visitors to sign in, remembering the /app page", async () => {
    const response = await proxy(request("/app/settings/members?tab=1"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fapp%2Fsettings%2Fmembers%3Ftab%3D1",
    );
  });

  it("does not add next for the dashboard itself or Create Wedding", async () => {
    expect((await proxy(request("/app"))).headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
    expect((await proxy(request("/create-wedding"))).headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  it("lets a request with a session cookie through, telling the guard which page it was", async () => {
    const response = await proxy(request("/app/tasks", true));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get(`x-middleware-request-${REQUEST_PATH_HEADER}`)).toBe("/app/tasks");
  });
});

describe("proxy: wedding websites (QA W1)", () => {
  it("lets a published website through, without needing a session", async () => {
    isPublished.mockResolvedValue(true);

    const response = await proxy(request("/w/akshay-princi-14022027"));

    expect(isPublished).toHaveBeenCalledWith("akshay-princi-14022027");
    expect(rewrittenTo(response)).toBeNull();
    expect(response.headers.get("location")).toBeNull();
  });

  it("rewrites unknown and unpublished websites to a real 404", async () => {
    isPublished.mockResolvedValue(false);

    const response = await proxy(request("/w/does-not-exist"));

    expect(rewrittenTo(response)).toBe(`http://localhost:3000${WEBSITE_NOT_FOUND_PATH}`);
  });

  it("never looks up nested paths", async () => {
    const response = await proxy(request("/w/akshay/extra"));

    expect(isPublished).not.toHaveBeenCalled();
    expect(rewrittenTo(response)).toBe(`http://localhost:3000${WEBSITE_NOT_FOUND_PATH}`);
  });

  it("leaves the decision to the page when the database can't answer", async () => {
    const failing = async (): Promise<boolean> => Promise.reject(new Error("db down"));

    const response = await websiteGate(
      request("/w/akshay-princi-14022027"),
      "akshay-princi-14022027",
      failing,
    );

    expect(rewrittenTo(response)).toBeNull();
  });
});
