import "server-only";

import { after } from "next/server";

import { logger } from "@/server/logging/logger";

/**
 * Runs `task` once the response has been sent (Next.js `after`). Use it for
 * side effects whose duration must not show in response timing, e.g. emailing
 * only when an account exists (API_DESIGN §15). Failures are logged, never thrown.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>): void {
  after(async () => {
    try {
      await task();
    } catch (error) {
      logger.error("Background task failed", { task: label, error });
    }
  });
}
