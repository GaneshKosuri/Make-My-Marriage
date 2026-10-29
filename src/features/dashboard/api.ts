"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { DashboardDto } from "@/modules/dashboard/dashboard.types";

import { dashboardKeys } from "./query-keys";

/** GET /api/dashboard (API_DESIGN §20): countdown, summary counts, upcoming events and tasks. */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => apiFetch<DashboardDto>("/api/dashboard", { signal }),
  });
}
