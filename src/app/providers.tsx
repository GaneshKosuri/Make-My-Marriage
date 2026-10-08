"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api-client";

const MAX_QUERY_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  // 4xx responses (validation, auth, not found, conflict, rate limit) won't
  // succeed on retry; network failures and 5xx might.
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

/** Client-side providers. TanStack Query talks to the REST API via `@/lib/api-client`. */
export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: shouldRetry, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
