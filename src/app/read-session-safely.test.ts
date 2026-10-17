import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentContext = vi.fn();
vi.mock("@/server/auth", () => ({ getCurrentContext }));
// Plain errors pass through; Next.js control-flow errors are rethrown.
const unstableRethrow = vi.fn();
vi.mock("next/navigation", () => ({ unstable_rethrow: unstableRethrow }));
const warn = vi.fn();
vi.mock("@/server/logging/logger", () => ({ logger: { warn } }));

const { readSessionSafely } = await import("./read-session-safely");

beforeEach(() => {
  getCurrentContext.mockReset();
  unstableRethrow.mockReset();
  warn.mockReset();
});

describe("readSessionSafely", () => {
  it("returns the session, or null for a signed-out visitor", async () => {
    const session = { user: { name: "Romeo" }, membership: null, wedding: null };
    getCurrentContext.mockResolvedValue(session);
    expect(await readSessionSafely("auth")).toBe(session);
    getCurrentContext.mockResolvedValue(null);
    expect(await readSessionSafely("auth")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("treats a session check that fails (database down) as signed out", async () => {
    getCurrentContext.mockRejectedValue(new Error("Could not connect to any servers"));
    expect(await readSessionSafely("create-wedding")).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      "Could not check the session; treating the visitor as signed out",
      expect.objectContaining({ page: "create-wedding", error: expect.any(Error) }),
    );
  });

  it("lets Next.js control-flow errors through", async () => {
    const bailout = new Error("NEXT_PRERENDER_INTERRUPTED");
    getCurrentContext.mockRejectedValue(bailout);
    unstableRethrow.mockImplementation((error: unknown) => {
      throw error;
    });
    await expect(readSessionSafely("auth")).rejects.toBe(bailout);
    expect(warn).not.toHaveBeenCalled();
  });
});
