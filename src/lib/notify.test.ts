import { afterEach, describe, expect, it, vi } from "vitest";

const sonner = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => sonner);

import { ApiError } from "./api-client";
import { errorMessage, markErrorHandled, notify, notifyError, shouldToastError } from "./notify";

afterEach(() => vi.clearAllMocks());

describe("notify", () => {
  it("shows success and error toasts", () => {
    notify.success("Haldi updated.");
    notify.error("We couldn't save.", { description: "Try again." });
    expect(sonner.toast.success).toHaveBeenCalledWith("Haldi updated.", {
      description: undefined,
      action: undefined,
    });
    expect(sonner.toast.error).toHaveBeenCalledWith("We couldn't save.", {
      description: "Try again.",
    });
  });
});

describe("errorMessage", () => {
  it("uses the server's message, then the fallback", () => {
    expect(errorMessage(new ApiError(409, "CONFLICT", "Someone else saved it."))).toBe(
      "Someone else saved it.",
    );
    expect(errorMessage(new ApiError(500, "INTERNAL_ERROR", " "), "Couldn't save.")).toBe(
      "Couldn't save.",
    );
    expect(errorMessage(new Error("boom"))).toBe("Something went wrong. Please try again.");
  });

  it("explains a network failure", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toMatch(/connection/);
  });
});

describe("notifyError", () => {
  it("leaves field errors to the form", () => {
    const fields = new ApiError(400, "VALIDATION_ERROR", "Invalid", { name: "Required" });
    expect(shouldToastError(fields)).toBe(false);
    notifyError(fields);
    expect(sonner.toast.error).not.toHaveBeenCalled();
  });

  it("toasts a validation error that names no field", () => {
    notifyError(new ApiError(400, "VALIDATION_ERROR", "Turn the gallery on first."));
    expect(sonner.toast.error).toHaveBeenCalledWith("Turn the gallery on first.", {
      description: undefined,
    });
  });

  it("skips an error the screen explained itself", () => {
    const error = new ApiError(409, "CONFLICT", "x");
    markErrorHandled(error);
    notifyError(error);
    expect(sonner.toast.error).not.toHaveBeenCalled();
  });
});
