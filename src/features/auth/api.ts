"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { apiAction, apiFetch, ApiError } from "@/lib/api-client";
import type {
  AuthResultDto,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
} from "@/modules/auth/auth.types";

import { authKeys } from "./query-keys";

/** TanStack Query mutations over the auth REST API (API_DESIGN §11–16). */

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<AuthResultDto>("/api/auth/login", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignupInput) =>
      apiFetch<AuthResultDto>("/api/auth/signup", { method: "POST", body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      apiAction("/api/auth/forgot-password", { body: input }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      apiAction("/api/auth/reset-password", { body: input }),
  });
}

/** The API error code, or null for network failures and unexpected errors. */
export function errorCode(error: unknown): ApiError["code"] | null {
  return error instanceof ApiError ? error.code : null;
}

/**
 * Puts VALIDATION_ERROR details onto the matching form fields. Returns true
 * when at least one field received a message (so no banner is needed).
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) {
    return false;
  }
  let applied = false;
  for (const field of fields) {
    const message = error.details[field];
    if (message) {
      setError(field, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
