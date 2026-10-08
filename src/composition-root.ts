import "server-only";

import { identityPorts } from "@/modules/auth";
import { configureIdentity } from "@/server/auth/identity";

/**
 * The composition root: the ONE place that connects infrastructure ports
 * (src/server) to their domain implementations (src/modules). src/server never
 * imports src/modules (dependency rule 3), so anything it needs from the
 * domain is registered here.
 *
 * Called from src/instrumentation.ts (once per Next.js server instance, before
 * any request) and from the Vitest setup files.
 */
let registered = false;

export function registerServerDependencies(): void {
  if (registered) return;
  configureIdentity(identityPorts);
  registered = true;
}
