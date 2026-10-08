import "server-only";

import { pingDatabase } from "@/server/db/connection";

export interface HealthReport {
  status: "ok";
  db: "up" | "down";
}

/** Liveness + database reachability for GET /api/health (scaffold-only endpoint). */
export async function getHealthReport(): Promise<HealthReport> {
  return { status: "ok", db: (await pingDatabase()) ? "up" : "down" };
}
