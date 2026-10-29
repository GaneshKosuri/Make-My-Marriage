/** GET /api/dashboard (API_DESIGN §20). Isomorphic. */
import type { EventDto } from "@/modules/events/event.types";
import type { TaskDto } from "@/modules/tasks/task.types";

export interface DashboardDto {
  countdown: {
    weddingDate: string;
    /** Calendar days in the wedding's time zone (PRD §9.3). */
    daysRemaining: number;
  };
  summary: {
    /** Events that are not archived. */
    events: number;
    tasks: { total: number; completed: number };
    /** Guest entries (invitations); one entry can bring several people. */
    guests: number;
    rsvps: {
      pending: number;
      attending: number;
      notAttending: number;
      /** People coming: the sum of attendingCount over attending guests (SYSTEM_DESIGN §23). */
      peopleAttending: number;
    };
    /** Guests whose invitation has been sent (the "Send invitations" step). */
    invitationsSent: number;
    /** Wedding Members, including the signed-in one (the "Invite a family member" step). */
    members: number;
    totalExpensePaise: number;
    /** Vendors that are not archived. */
    vendors: number;
  };
  /** Nearest events that have not finished, with venue and dress code for the cards. */
  upcomingEvents: EventDto[];
  /** Incomplete tasks, nearest due date first. */
  upcomingTasks: TaskDto[];
}
