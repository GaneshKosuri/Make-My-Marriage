import "server-only";

import type { EventSummaryDto } from "@/modules/events/event.types";
import type { MemberRole } from "@/modules/members/member.constants";

import type { TaskRecord } from "./task.model";
import type { TaskDto } from "./task.types";

export type AssigneeSummary = { membershipId: string; name: string; role: MemberRole };

/**
 * Task document → DTO (API_DESIGN §34 notes): nullable `assignee` (membership
 * id, name, role — never email) and `event` (id, name, archivedAt) summaries.
 * A removed assignee or a missing event maps to null.
 */
export function toTaskDto(
  task: TaskRecord,
  assignees: ReadonlyMap<string, AssigneeSummary>,
  events: ReadonlyMap<string, EventSummaryDto>,
): TaskDto {
  const assignee = task.assignedMembershipId
    ? assignees.get(task.assignedMembershipId.toString())
    : undefined;
  const event = task.eventId ? events.get(task.eventId.toString()) : undefined;
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    assignee: assignee ?? null,
    event: event ? { id: event.id, name: event.name, archivedAt: event.archivedAt } : null,
    version: task.__v,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
