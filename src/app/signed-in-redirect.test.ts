import { beforeEach, describe, expect, it, vi } from "vitest";

const readSessionSafely = vi.fn();
vi.mock("./read-session-safely", () => ({ readSessionSafely }));
// redirect() throws to stop rendering, like Next.js does.
const redirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect }));

const { SignedOutGate, workspacePathFor } = await import("./signed-in-redirect");

const member = {
  user: { id: "u1", name: "Akshay", email: "a@example.com" },
  membership: { membershipId: "m1", weddingId: "w1", role: "MANAGER" },
  wedding: { id: "w1" },
} as never;
const noWedding = { user: { id: "u2" }, membership: null, wedding: null } as never;

beforeEach(() => {
  readSessionSafely.mockReset();
  redirect.mockClear();
});

describe("signed-in visitors on signed-out pages (home, login, signup)", () => {
  it("sends a wedding member to the dashboard before anything renders", async () => {
    readSessionSafely.mockResolvedValue(member);
    await expect(SignedOutGate({ page: "home", children: "Home page" })).rejects.toThrow(
      "NEXT_REDIRECT /app",
    );
    expect(readSessionSafely).toHaveBeenCalledWith("home");
  });

  it("sends someone without a wedding yet to Create Wedding", async () => {
    readSessionSafely.mockResolvedValue(noWedding);
    await expect(SignedOutGate({ page: "home", children: "Home page" })).rejects.toThrow(
      "NEXT_REDIRECT /create-wedding",
    );
    expect(workspacePathFor(noWedding)).toBe("/create-wedding");
  });

  it("shows the page to signed-out visitors, and when the session can't be checked", async () => {
    readSessionSafely.mockResolvedValue(null);
    expect(await SignedOutGate({ page: "home", children: "Home page" })).toBe("Home page");
    expect(redirect).not.toHaveBeenCalled();
  });
});
