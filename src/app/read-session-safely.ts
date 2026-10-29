import "server-only";

import { unstable_rethrow } from "next/navigation";

import { getCurrentContext, type CurrentContext } from "@/server/auth";
import { logger } from "@/server/logging/logger";

/**
 * The current session for a page's routing decision, or null when there is
 * none or it cannot be checked (the database is unreachable, say).
 *
 * Pages use it to decide where a visitor belongs. A failed check is treated
 * as "signed out", so the page renders or redirects to /login instead of
 * crashing with an error that cannot be sent to the browser. Next.js
 * control-flow errors (prerender bail-outs) are passed through untouched.
 * Never use it to authorise data access: API routes do that via `route({ auth })`.
 */
export async function readSessionSafely(page: string): Promise<CurrentContext | null> {
  try {
    return await getCurrentContext();
  } catch (error) {
    unstable_rethrow(error);
    logger.warn("Could not check the session; treating the visitor as signed out", {
      page,
      error,
    });
    return null;
  }
}
