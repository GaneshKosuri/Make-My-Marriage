import "server-only";

import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { DashboardDto } from "./dashboard.types";

/**
 * Read-only aggregation; owns no model (PRD §9.3; DATABASE_DESIGN §88–89; API_DESIGN §20).
 * Composes other modules' public APIs — eventsService.countActive / listUpcoming,
 * tasksService.countForDashboard / listUpcoming, guestsService.countForDashboard,
 * expensesService.totalForDashboard, vendorsService.countForDashboard — plus
 * `daysUntil()` from @/lib/dates in the wedding's time zone. No denormalised counters.
 */
export const dashboardService = {
  async getDashboard(ctx: MemberContext): Promise<DashboardDto> {
    return notImplemented("API_DESIGN §20 (Phase 1: Foundation)");
  },
};
