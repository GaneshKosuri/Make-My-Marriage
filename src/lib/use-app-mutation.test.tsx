// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const sonner = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("sonner", () => sonner);

import { ApiError } from "./api-client";
import { markErrorHandled } from "./notify";
import { useAppMutation } from "./use-app-mutation";

afterEach(() => vi.clearAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const fail = (error: unknown) => () => Promise.reject(error);

describe("useAppMutation", () => {
  it("shows the server's message when an action fails", async () => {
    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: fail(new ApiError(429, "RATE_LIMITED", "Slow down.")),
          onError,
        }),
      { wrapper },
    );
    act(() => result.current.mutate());
    await waitFor(() =>
      expect(sonner.toast.error).toHaveBeenCalledWith("Slow down.", { description: undefined }),
    );
    expect(onError).toHaveBeenCalled();
  });

  it("stays quiet when the screen explains failures itself", async () => {
    const { result } = renderHook(
      () =>
        useAppMutation({
          mutationFn: fail(new ApiError(401, "UNAUTHENTICATED", "x")),
          errorToast: false,
        }),
      { wrapper },
    );
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isError).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sonner.toast.error).not.toHaveBeenCalled();
  });

  it("lets the caller replace the toast with a better one", async () => {
    const { result } = renderHook(
      () => useAppMutation({ mutationFn: fail(new ApiError(409, "CONFLICT", "x")) }),
      { wrapper },
    );
    act(() => result.current.mutate(undefined, { onError: (error) => markErrorHandled(error) }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sonner.toast.error).not.toHaveBeenCalled();
  });

  it("shows nothing when the action succeeds", async () => {
    const { result } = renderHook(() => useAppMutation({ mutationFn: () => Promise.resolve(1) }), {
      wrapper,
    });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sonner.toast.error).not.toHaveBeenCalled();
    expect(sonner.toast.success).not.toHaveBeenCalled();
  });
});
