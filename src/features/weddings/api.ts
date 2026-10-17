"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { CreatedWeddingDto, CreateWeddingInput } from "@/modules/weddings/wedding.types";

import { authKeys } from "../auth/query-keys";
import { weddingsKeys } from "./query-keys";

/** POST /api/wedding (API_DESIGN §17). The signed-in user becomes the first Admin. */
export function useCreateWedding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWeddingInput) =>
      apiFetch<CreatedWeddingDto>("/api/wedding", { method: "POST", body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: weddingsKeys.all }),
        queryClient.invalidateQueries({ queryKey: authKeys.all }),
      ]),
  });
}
