import { toast } from "sonner";

import { ApiError } from "./api-client";

/**
 * Success and error notifications (toasts, top right). One place to call, so
 * the toast library stays an implementation detail. Rendered by <AppToaster />.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";
const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";

export interface NotifyAction {
  label: string;
  onClick: () => void;
}

export const notify = {
  success(message: string, options: { description?: string; action?: NotifyAction } = {}) {
    toast.success(message, { description: options.description, action: options.action });
  },
  error(message: string, options: { description?: string } = {}) {
    toast.error(message, { description: options.description });
  },
};

/**
 * What a failed request should say: the server's own message when it sent one
 * (it is written for people), otherwise `fallback` or a generic line.
 */
export function errorMessage(error: unknown, fallback = GENERIC_ERROR): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return NETWORK_ERROR;
    return error.message.trim() || fallback;
  }
  if (error instanceof TypeError) return NETWORK_ERROR;
  return fallback;
}

/**
 * Field errors are shown next to the fields of the form that sent them, so they
 * get no toast. Everything else does.
 */
export function shouldToastError(error: unknown): boolean {
  return !(
    error instanceof ApiError &&
    error.code === "VALIDATION_ERROR" &&
    error.details !== undefined &&
    Object.keys(error.details).length > 0
  );
}

const handled = new WeakSet<object>();

/**
 * A screen that explains this failure itself (its own toast or message) marks
 * it, so the generic error toast from `useAppMutation` is skipped.
 */
export function markErrorHandled(error: unknown): void {
  if (typeof error === "object" && error !== null) handled.add(error);
}

/** A toast for a failed action, unless the form shows it on its fields. */
export function notifyError(error: unknown, fallback?: string): void {
  if (typeof error === "object" && error !== null && handled.has(error)) return;
  if (shouldToastError(error)) notify.error(errorMessage(error, fallback));
}
