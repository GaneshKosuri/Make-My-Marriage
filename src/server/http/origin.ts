import "server-only";

import { getEnv } from "@/server/config/env";
import { AppError } from "@/server/errors";

/**
 * CSRF defence for cookie-authenticated mutations (API_DESIGN §100): the
 * `Origin` header must equal NEXT_PUBLIC_APP_URL's origin. Browsers always send
 * Origin on POST/PATCH/DELETE; a missing or foreign Origin is rejected.
 * The Host header is never trusted.
 */
export function assertSameOrigin(request: Request): void {
  const expected = getEnv().NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get("origin");
  if (origin !== expected) {
    throw new AppError("FORBIDDEN", "Cross-origin request rejected.");
  }
}
