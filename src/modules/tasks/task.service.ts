import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { AppError, isAppError } from "@/server/errors";
import { buildPagePagination } from "@/server/http/pagination";
import { logger } from "@/server/logging/logger";

import { eventsService } from "@/modules/events";
import { membersService } from "@/modules/members";

import { TASK_FILTER_NONE, type TaskStatus } from "./task.constants";
import { toTaskDto } from "./task.mapper";
import type { TaskRecord } from "./task.model";
import { taskRepository, type TaskFields, type TaskListFilter } from "./task.repository";
import type { CreateTaskInput, ListTasksQuery, TaskDto, UpdateTaskInput } from "./task.types";

const noneToNull = (value: string | undefined) => (value === TASK_FILTER_NONE ? null : value);

/** True when `id` is set and differs from the reference the task already has. */
const isNewReference = (id: string | null | undefined, existing: { toString(): string } | null) =>
  id != null && id !== (existing?.toString() ?? null);

/**
 * Checks references the task is about to gain (DATABASE_DESIGN §38, §83): the
 * assignee must be a current member and the event an active event of this
 * wedding. A reference the task already has is kept as it is, even if that
 * member has left or the event is archived (API_DESIGN §35 notes).
 */
async function assertNewReferences(
  weddingId: string,
  next: { assignedMembershipId?: string | null; eventId?: string | null },
  current: TaskRecord | null,
): Promise<void> {
  const { assignedMembershipId, eventId } = next;
  const results = await Promise.allSettled([
    assignedMembershipId &&
    isNewReference(assignedMembershipId, current?.assignedMembershipId ?? null)
      ? membersService.assertMembershipInWedding(weddingId, assignedMembershipId)
      : undefined,
    eventId && isNewReference(eventId, current?.eventId ?? null)
      ? eventsService.assertActiveEventsInWedding(weddingId, [eventId])
      : undefined,
  ]);
  // Report every bad reference at once, so the form can mark both fields.
  const details: Record<string, string> = {};
  for (const result of results) {
    if (result.status === "fulfilled") continue;
    if (!isAppError(result.reason) || result.reason.code !== "VALIDATION_ERROR") {
      throw result.reason;
    }
    Object.assign(details, result.reason.details);
  }
  if (Object.keys(details).length > 0) {
    throw new AppError("VALIDATION_ERROR", undefined, { details });
  }
}

/** completedAt is server-owned: set on becoming COMPLETED, kept while it stays COMPLETED. */
function completedAtFor(status: TaskStatus, current: TaskRecord | null, now: Date): Date | null {
  if (status !== "COMPLETED") return null;
  return current?.status === "COMPLETED" ? current.completedAt : now;
}

/**
 * Tasks (PRD §9.6; SYSTEM_DESIGN §30; DATABASE_DESIGN §36–40; API_DESIGN §34–38). Phase 2.
 * Admins and Managers have the same permissions.
 */
export const tasksService = {
  /**
   * Newest first. Filters combine with AND; `mine=true` means the caller's
   * membership, and a different explicit assignee with it matches nothing. API §34.
   */
  async list(ctx: MemberContext, query: ListTasksQuery): Promise<PageResult<TaskDto>> {
    const page = { page: query.page, limit: query.limit };
    const filter: TaskListFilter = {
      status: query.status,
      priority: query.priority,
      eventId: noneToNull(query.eventId),
      assignedMembershipId: noneToNull(query.assignedMembershipId),
    };
    if (query.mine) {
      if (
        filter.assignedMembershipId !== undefined &&
        filter.assignedMembershipId !== ctx.membershipId
      ) {
        return { items: [], pagination: buildPagePagination(0, page) };
      }
      filter.assignedMembershipId = ctx.membershipId;
    }
    const { items, total } = await taskRepository.list(ctx.weddingId, filter, page);
    return {
      items: await toTaskDtos(ctx.weddingId, items),
      pagination: buildPagePagination(total, page),
    };
  },

  /** Creating a COMPLETED task sets completedAt server-side. API §35. */
  async create(ctx: MemberContext, input: CreateTaskInput): Promise<TaskDto> {
    await assertNewReferences(ctx.weddingId, input, null);
    const task = await taskRepository.create(ctx.weddingId, {
      title: input.title,
      description: input.description || null,
      assignedMembershipId: input.assignedMembershipId ?? null,
      eventId: input.eventId ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority,
      status: input.status,
      completedAt: completedAtFor(input.status, null, new Date()),
    });
    logger.info("Task created", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      taskId: task._id.toString(),
    });
    return toSingleDto(ctx.weddingId, task);
  },

  /** `_id + weddingId`; cross-wedding → NOT_FOUND. API §36. */
  async get(ctx: MemberContext, taskId: string): Promise<TaskDto> {
    const task = await taskRepository.findById(ctx.weddingId, taskId);
    if (!task) throw new AppError("NOT_FOUND");
    return toSingleDto(ctx.weddingId, task);
  },

  /**
   * Partial. completedAt follows status; metadata edits keep it. A stale
   * `version`, or another write between our read and update, is CONFLICT. API §37.
   */
  async update(ctx: MemberContext, taskId: string, input: UpdateTaskInput): Promise<TaskDto> {
    const current = await taskRepository.findById(ctx.weddingId, taskId);
    if (!current) throw new AppError("NOT_FOUND");
    if (input.version !== undefined && input.version !== current.__v) {
      throw new AppError("CONFLICT");
    }
    await assertNewReferences(ctx.weddingId, input, current);

    const changes: Partial<TaskFields> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.description !== undefined) changes.description = input.description || null;
    if (input.assignedMembershipId !== undefined) {
      changes.assignedMembershipId = input.assignedMembershipId;
    }
    if (input.eventId !== undefined) changes.eventId = input.eventId;
    if (input.dueDate !== undefined) {
      changes.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.priority !== undefined) changes.priority = input.priority;
    if (input.status !== undefined) {
      changes.status = input.status;
      changes.completedAt = completedAtFor(input.status, current, new Date());
    }

    const updated = await taskRepository.updateVersioned(
      ctx.weddingId,
      taskId,
      current.__v,
      changes,
    );
    if (!updated) {
      const stillThere = await taskRepository.findById(ctx.weddingId, taskId);
      throw new AppError(stillThere ? "CONFLICT" : "NOT_FOUND");
    }
    logger.info("Task updated", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      taskId,
      fields: Object.keys(changes),
    });
    return toSingleDto(ctx.weddingId, updated);
  },

  /** Hard delete (DATABASE_DESIGN §40). API §38. */
  async delete(ctx: MemberContext, taskId: string): Promise<void> {
    if (!(await taskRepository.delete(ctx.weddingId, taskId))) throw new AppError("NOT_FOUND");
    logger.info("Task deleted", { requestId: ctx.requestId, weddingId: ctx.weddingId, taskId });
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Dashboard "Tasks: 32 / 48 completed". */
  async countForDashboard(weddingId: string): Promise<{ total: number; completed: number }> {
    return taskRepository.countByStatus(weddingId);
  },

  /** Dashboard "Upcoming Tasks": incomplete, nearest due date first. */
  async listUpcoming(weddingId: string, limit: number): Promise<TaskDto[]> {
    const tasks = await taskRepository.listUpcomingIncomplete(weddingId, limit);
    return toTaskDtos(weddingId, tasks);
  },
};

/** Resolves assignee and event summaries in two batched lookups. */
async function toTaskDtos(weddingId: string, tasks: readonly TaskRecord[]): Promise<TaskDto[]> {
  if (tasks.length === 0) return [];
  const membershipIds = tasks.flatMap((task) =>
    task.assignedMembershipId ? [task.assignedMembershipId.toString()] : [],
  );
  const eventIds = tasks.flatMap((task) => (task.eventId ? [task.eventId.toString()] : []));
  const [assignees, events] = await Promise.all([
    membersService.findMemberSummaries(weddingId, membershipIds),
    eventsService.findSummaries(weddingId, eventIds),
  ]);
  return tasks.map((task) => toTaskDto(task, assignees, events));
}

async function toSingleDto(weddingId: string, task: TaskRecord): Promise<TaskDto> {
  const [dto] = await toTaskDtos(weddingId, [task]);
  return dto!;
}
