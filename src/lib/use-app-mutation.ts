"use client";

import {
  useMutation,
  type DefaultError,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";

import { notifyError } from "./notify";

/**
 * `useMutation` that shows an error toast when the action fails (field errors
 * excepted: the form shows those). Every feature's mutation hooks use it, so no
 * failed action goes unnoticed. `errorToast: false` turns it off where a screen
 * explains the failure itself (sign-in, sign-up, password reset); a string
 * replaces the generic fallback when the server sends no message.
 *
 * A screen with a better explanation calls `markErrorHandled(error)` in its own
 * onError and shows that instead.
 *
 * Success toasts are left to the screens: they know what was saved and can name
 * it ("Haldi updated.").
 */
export function useAppMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    errorToast?: false | string;
  },
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { errorToast, onError, ...rest } = options;
  return useMutation({
    ...rest,
    onError: (...args) => {
      // A tick later, so the caller's own onError (which runs after this one)
      // can mark the error handled and show a better message instead.
      if (errorToast !== false) setTimeout(() => notifyError(args[0], errorToast), 0);
      return onError?.(...args);
    },
  });
}
