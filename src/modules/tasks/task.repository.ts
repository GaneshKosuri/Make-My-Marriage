import "server-only";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { notImplemented } from "@/server/errors";

import type { TaskPriority, TaskStatus } from "./task.constants";
import { TaskModel, type TaskDoc, type TaskRecord } from "./task.model";

export interface TaskListFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  /** An id, or null for "none" (general tasks). */
  eventId?: string | null;
  /** An id, or null for "none" (unassigned). */
  assignedMembershipId?: string | null;
}

/** Data access for `tasks`. `weddingId` is ALWAYS the first argument. */
export const taskRepository = {
  /** Newest first, `_id` tie-breaker (API_DESIGN §34 notes). */
  async list(
    weddingId: string,
    filter: TaskListFilter,
    page: PageQuery,
  ): Promise<{ items: TaskRecord[]; total: number }> {
    return notImplemented("API_DESIGN §34 (Phase 2: Planning)");
  },

  async findById(weddingId: string, taskId: string): Promise<TaskRecord | null> {
    return notImplemented("API_DESIGN §36 (Phase 2: Planning)");
  },

  async create(
    weddingId: string,
    input: Omit<TaskDoc, "weddingId" | "__v" | "createdAt" | "updatedAt">,
  ): Promise<TaskRecord> {
    return notImplemented("API_DESIGN §35 (Phase 2: Planning)");
  },

  /** Conditional on `__v === expectedVersion`. */
  async updateVersioned(
    weddingId: string,
    taskId: string,
    expectedVersion: number,
    changes: Partial<TaskDoc>,
  ): Promise<TaskRecord | null> {
    return notImplemented("API_DESIGN §37 (Phase 2: Planning)");
  },

  async delete(weddingId: string, taskId: string): Promise<boolean> {
    return notImplemented("API_DESIGN §38 (Phase 2: Planning)");
  },

  async countByStatus(weddingId: string): Promise<{ total: number; completed: number }> {
    await connectToDatabase();
    const scope = { weddingId: toObjectId(weddingId, "weddingId") };
    const [total, completed] = await Promise.all([
      TaskModel.countDocuments(scope).exec(),
      TaskModel.countDocuments({ ...scope, status: "COMPLETED" }).exec(),
    ]);
    return { total, completed };
  },

  /** Incomplete tasks, nearest due date first; tasks without a due date come last. */
  async listUpcomingIncomplete(weddingId: string, limit: number): Promise<TaskRecord[]> {
    await connectToDatabase();
    return TaskModel.aggregate<TaskRecord>([
      {
        $match: {
          weddingId: toObjectId(weddingId, "weddingId"),
          status: { $ne: "COMPLETED" },
        },
      },
      { $addFields: { hasNoDueDate: { $eq: [{ $ifNull: ["$dueDate", null] }, null] } } },
      { $sort: { hasNoDueDate: 1, dueDate: 1, createdAt: 1, _id: 1 } },
      { $limit: limit },
      { $project: { hasNoDueDate: 0 } },
    ]).exec();
  },
};
