/** GET /api/dashboard (API_DESIGN §20). Isomorphic. */
import type { EventSummaryDto } from "@/modules/events/event.types";
import type { TaskDto } from "@/modules/tasks/task.types";

export interface DashboardDto {
  countdown: {
    weddingDate: string;
    /** Calendar days in the wedding's time zone (PRD §9.3). */
    daysRemaining: number;
  };
  summary: {
    events: number;
    tasks: { total: number; completed: number };
    guests: number;
    rsvps: { pending: number; attending: number; notAttending: number };
    totalExpensePaise: number;
    vendors: number;
  };
  upcomingEvents: EventSummaryDto[];
  upcomingTasks: TaskDto[];
}
