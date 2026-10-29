import "server-only";

import { daysUntil } from "@/lib/dates";
import type { MemberContext } from "@/server/auth";
import { AppError } from "@/server/errors";

import { eventsService } from "@/modules/events";
import { expensesService } from "@/modules/expenses";
import { guestsService } from "@/modules/guests";
import { membersService } from "@/modules/members";
import { tasksService } from "@/modules/tasks";
import { vendorsService } from "@/modules/vendors";
import { weddingsService } from "@/modules/weddings";

import {
  DASHBOARD_UPCOMING_EVENTS_LIMIT,
  DASHBOARD_UPCOMING_TASKS_LIMIT,
} from "./dashboard.constants";
import type { DashboardDto } from "./dashboard.types";

/**
 * Read-only aggregation; owns no model (PRD §9.3; DATABASE_DESIGN §88–89; API_DESIGN §20).
 * Composes other modules' public APIs and computes the countdown with `daysUntil()` in
 * the wedding's time zone. No denormalised counters: every number is counted on request.
 */
export const dashboardService = {
  async getDashboard(ctx: MemberContext, now = new Date()): Promise<DashboardDto> {
    const { weddingId } = ctx;
    const wedding = await weddingsService.findIdentityWedding(weddingId);
    if (!wedding) throw new AppError("NOT_FOUND");

    const [
      events,
      tasks,
      guests,
      members,
      totalExpensePaise,
      vendors,
      upcomingEvents,
      upcomingTasks,
    ] = await Promise.all([
      eventsService.countActive(weddingId),
      tasksService.countForDashboard(weddingId),
      guestsService.countForDashboard(weddingId),
      membersService.countMembers(weddingId),
      expensesService.totalForDashboard(weddingId),
      vendorsService.countForDashboard(weddingId),
      eventsService.listUpcoming(weddingId, DASHBOARD_UPCOMING_EVENTS_LIMIT, now),
      tasksService.listUpcoming(weddingId, DASHBOARD_UPCOMING_TASKS_LIMIT),
    ]);

    return {
      countdown: {
        weddingDate: wedding.weddingDate,
        daysRemaining: daysUntil(wedding.weddingDate, wedding.timeZone, now),
      },
      summary: {
        events,
        tasks,
        guests: guests.guests,
        rsvps: guests.rsvps,
        invitationsSent: guests.invitationsSent,
        members,
        totalExpensePaise,
        vendors,
      },
      upcomingEvents,
      upcomingTasks,
    };
  },
};
