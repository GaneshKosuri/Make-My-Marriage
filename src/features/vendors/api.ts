"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { expensesKeys } from "@/features/expenses/query-keys";
import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { VendorCategory } from "@/modules/vendors/vendor.constants";
import type {
  DiscoveredPlaceDetailsDto,
  DiscoveredVendorDto,
  VendorDto,
} from "@/modules/vendors/vendor.types";

import type { AddVendorFromPlaceBody, CreateVendorBody, UpdateVendorBody } from "./vendor-form";
import { vendorDiscoveryKeys, vendorsKeys } from "./query-keys";

/** TanStack Query hooks over the Vendors REST API (API_DESIGN §59–64). */

export interface VendorsQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: VendorCategory;
  includeArchived?: boolean;
}

const vendorPath = (vendorId: string) => `/api/vendors/${encodeURIComponent(vendorId)}`;

/** GET /api/vendors (API §59): one page in name order. The last page stays on screen while the next loads. */
export function useVendors(query: VendorsQuery) {
  return useQuery({
    queryKey: vendorsKeys.list({ ...query }),
    queryFn: ({ signal }) =>
      apiFetchPage<VendorDto>("/api/vendors", { query: { ...query }, signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /api/vendors/:id (API §62); archived vendors too. */
export function useVendor(vendorId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: vendorsKeys.detail(vendorId),
    queryFn: ({ signal }) => apiFetch<VendorDto>(vendorPath(vendorId), { signal }),
    enabled: enabled && vendorId !== "",
  });
}

/**
 * Lists, pages, the dashboard's vendor count and expenses (which show each
 * vendor's name and whether it is archived) change together (QA V2).
 */
function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: expensesKeys.all }),
      ]),
    [queryClient],
  );
}

/** POST /api/vendors (API §60). */
export function useCreateVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: (body: CreateVendorBody) =>
      apiFetch<VendorDto>("/api/vendors", { method: "POST", body }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/vendors/:id (API §63): changed fields plus the version they were read at. */
export function useUpdateVendor() {
  const invalidate = useInvalidateVendors();
  return useMutation({
    mutationFn: ({ vendorId, body }: { vendorId: string; body: UpdateVendorBody }) =>
      apiFetch<VendorDto>(vendorPath(vendorId), { method: "PATCH", body }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/vendors/:id (API §64): archives; expenses keep the link. */
export function useArchiveVendor() {
  const invalidate = useInvalidateVendors();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => apiAction(vendorPath(vendorId), { method: "DELETE" }),
    onSuccess: (_result, vendorId) => {
      // Discover results already on screen show it as archived, without asking
      // Google again (QA V2).
      queryClient.setQueriesData<DiscoveredVendorDto[]>(
        { queryKey: [...vendorDiscoveryKeys.all, "search"] },
        (places) =>
          places?.map((place) =>
            place.myVendor?.id === vendorId
              ? { ...place, myVendor: { ...place.myVendor, archived: true } }
              : place,
          ),
      );
      return invalidate();
    },
  });
}

/**
 * The latest copy of one vendor, e.g. to reload an edit form after a CONFLICT.
 * Lists are refreshed too.
 */
export function useReloadVendor() {
  const queryClient = useQueryClient();
  return async (vendorId: string) => {
    const vendor = await queryClient.fetchQuery({
      queryKey: vendorsKeys.detail(vendorId),
      queryFn: ({ signal }) => apiFetch<VendorDto>(vendorPath(vendorId), { signal }),
      staleTime: 0,
    });
    void queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
    return vendor;
  };
}

// ── Discovery (API §61, §65–66) ─────────────────────────────────────────────

export interface VendorDiscoverySearch {
  category: VendorCategory;
  near: string;
  query?: string;
}

/** Results stay for the visit: each search is a billed Google request (30 per wedding per hour). */
const DISCOVERY_STALE_MS = 30 * 60_000;

/**
 * GET /api/vendor-discovery/search (API §65–66). Runs only for a submitted
 * search (`null` until then) and never retries or refetches on its own.
 */
export function useVendorDiscovery(search: VendorDiscoverySearch | null) {
  return useQuery({
    queryKey: vendorDiscoveryKeys.search({ ...search }),
    queryFn: ({ signal }) =>
      apiFetch<DiscoveredVendorDto[]>("/api/vendor-discovery/search", {
        query: { ...search },
        signal,
      }),
    enabled: search !== null,
    staleTime: DISCOVERY_STALE_MS,
    gcTime: DISCOVERY_STALE_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** GET /api/vendor-discovery/places/:placeId: what pre-fills the add form. */
export function useDiscoveredPlace(placeId: string | null) {
  return useQuery({
    queryKey: vendorDiscoveryKeys.place(placeId ?? ""),
    queryFn: ({ signal }) =>
      apiFetch<DiscoveredPlaceDetailsDto>(
        `/api/vendor-discovery/places/${encodeURIComponent(placeId!)}`,
        { signal },
      ),
    enabled: placeId !== null,
    staleTime: DISCOVERY_STALE_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * POST /api/vendors/from-place (API §61). Search results already on screen
 * mark the place as saved instead of searching Google again.
 */
export function useAddVendorFromPlace() {
  const invalidate = useInvalidateVendors();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddVendorFromPlaceBody) =>
      apiFetch<VendorDto>("/api/vendors/from-place", { method: "POST", body }),
    onSuccess: (vendor) => {
      const myVendor = { id: vendor.id, archived: false };
      queryClient.setQueriesData<DiscoveredVendorDto[]>(
        { queryKey: [...vendorDiscoveryKeys.all, "search"] },
        (places) =>
          places?.map((place) =>
            place.googlePlaceId === vendor.googlePlaceId ? { ...place, myVendor } : place,
          ),
      );
      if (vendor.googlePlaceId) {
        queryClient.removeQueries({ queryKey: vendorDiscoveryKeys.place(vendor.googlePlaceId) });
      }
      return invalidate();
    },
  });
}
