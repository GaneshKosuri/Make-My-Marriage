import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type { CreateTaskInput, ListTasksQuery, TaskDto, UpdateTaskInput } from "./task.types";

/**
 * Tasks (PRD §9.6; SYSTEM_DESIGN §30; DATABASE_DESIGN §36–40; API_DESIGN §34–38). Phase 2.
 * New associations are validated through other modules' public APIs, e.g.
 *   eventsService.assertActiveEventsInWedding(ctx.weddingId, [eventId])
 *   membersService.assertMembershipInWedding(ctx.weddingId, assignedMembershipId)
 */
export const tasksService = {
  /** Filters AND together; `mine=true` → ctx.membershipId. API §34. */
  async list(ctx: MemberContext, query: ListTasksQuery): Promise<PageResult<TaskDto>> {
    return notImplemented("API_DESIGN §34 (Phase 2: Planning)");
  },

  /** Creating a COMPLETED task sets completedAt server-side. API §35. */
  async create(ctx: MemberContext, input: CreateTaskInput): Promise<TaskDto> {
    return notImplemented("API_DESIGN §35 (Phase 2: Planning)");
  },

  /** API §36. */
  async get(ctx: MemberContext, taskId: string): Promise<TaskDto> {
    return notImplemented("API_DESIGN §36 (Phase 2: Planning)");
  },

  /** completedAt follows status; `__v` mismatch → CONFLICT. API §37. */
  async update(ctx: MemberContext, taskId: string, input: UpdateTaskInput): Promise<TaskDto> {
    return notImplemented("API_DESIGN §37 (Phase 2: Planning)");
  },

  /** Hard delete. API §38. */
  async delete(ctx: MemberContext, taskId: string): Promise<void> {
    return notImplemented("API_DESIGN §38 (Phase 2: Planning)");
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard "Tasks: 32 / 48 completed". */
  async countForDashboard(weddingId: string): Promise<{ total: number; completed: number }> {
    return notImplemented("DATABASE_DESIGN §88 (Phase 1: Foundation — dashboard)");
  },

  /** Dashboard "Upcoming Tasks": incomplete, nearest due date first. */
  async listUpcoming(weddingId: string, limit: number): Promise<TaskDto[]> {
    return notImplemented("PRD §9.3 (Phase 1: Foundation — dashboard)");
  },
};
