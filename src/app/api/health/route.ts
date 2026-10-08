import { getHealthReport, ok, route } from "@/server/http";

/**
 * GET /api/health — scaffold-only liveness probe (not in the docs).
 * `{ data: { status: "ok", db: "up" | "down" } }`; always 200 while the app runs.
 */
export const GET = route({
  auth: "public",
  handler: async () => ok(await getHealthReport()),
});
