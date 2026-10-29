"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type {
  CreatedWeddingDto,
  CreateWeddingInput,
  UpdateWeddingInput,
  WeddingDto,
} from "@/modules/weddings/wedding.types";

import { authKeys } from "../auth/query-keys";
import { dashboardKeys } from "../dashboard/query-keys";
import { weddingsKeys } from "./query-keys";

/** POST /api/wedding (API_DESIGN §17). The signed-in user becomes the first Admin. */
export function useCreateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWeddingInput) =>
      apiFetch<CreatedWeddingDto>("/api/wedding", { method: "POST", body: input }),
    onSuccess: () => {
      // Anything cached from a wedding the user has since left belongs to that wedding.
      queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey[0] !== authKeys.all[0] });
      return queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

/** GET /api/wedding (API_DESIGN §18). */
export function useWedding() {
  return useQuery({
    queryKey: weddingsKeys.current(),
    queryFn: ({ signal }) => apiFetch<WeddingDto>("/api/wedding", { signal }),
  });
}

/** PATCH /api/wedding (API_DESIGN §19): send only the fields that changed. */
export function useUpdateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWeddingInput) =>
      apiFetch<WeddingDto>("/api/wedding", { method: "PATCH", body: input }),
    onSuccess: (wedding) => {
      queryClient.setQueryData(weddingsKeys.current(), wedding);
      // The dashboard countdown and couple come from the wedding too.
      return queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
