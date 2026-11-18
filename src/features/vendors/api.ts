"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { dashboardKeys } from "@/features/dashboard/query-keys";
import { apiAction, apiFetch, apiFetchPage } from "@/lib/api-client";
import type { VendorCategory } from "@/modules/vendors/vendor.constants";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import type { CreateVendorBody, UpdateVendorBody } from "./vendor-form";
import { vendorsKeys } from "./query-keys";

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
export function useVendor(vendorId: string) {
  return useQuery({
    queryKey: vendorsKeys.detail(vendorId),
    queryFn: ({ signal }) => apiFetch<VendorDto>(vendorPath(vendorId), { signal }),
  });
}

/** Lists, pages and the dashboard's vendor count change together. */
function useInvalidateVendors() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: vendorsKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
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
  return useMutation({
    mutationFn: (vendorId: string) => apiAction(vendorPath(vendorId), { method: "DELETE" }),
    onSuccess: invalidate,
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
