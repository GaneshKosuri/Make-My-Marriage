import "server-only";

import type { QueryFilter, Types } from "mongoose";

import type { PageQuery } from "@/lib/pagination";
import { connectToDatabase } from "@/server/db/connection";
import { toObjectId } from "@/server/db/object-id";
import { pageSkip } from "@/server/http/pagination";

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

/** The fields a member sets, plus the server-owned `completedAt`. */
export type TaskFields = Omit<
  TaskDoc,
  "weddingId" | "assignedMembershipId" | "eventId" | "__v" | "createdAt" | "updatedAt"
> & { assignedMembershipId: string | null; eventId: string | null };

const byId = (weddingId: string, taskId: string) => ({
  weddingId: toObjectId(weddingId, "weddingId"),
  _id: toObjectId(taskId, "taskId"),
});

const optionalId = (id: string | null, name: string): Types.ObjectId | null =>
  id === null ? null : toObjectId(id, name);

/** String ids → ObjectIds for the reference fields that are present. */
function toDocFields(fields: Partial<TaskFields>): Partial<TaskDoc> {
  const { assignedMembershipId, eventId, ...rest } = fields;
  return {
    ...rest,
    ...(assignedMembershipId !== undefined && {
      assignedMembershipId: optionalId(assignedMembershipId, "assignedMembershipId"),
    }),
    ...(eventId !== undefined && { eventId: optionalId(eventId, "eventId") }),
  };
}

/** Data access for `tasks`. `weddingId` is ALWAYS the first argument. */
export const taskRepository = {
  /** Newest first, `_id` tie-breaker (API_DESIGN §34 notes). Filters combine with AND. */
  async list(
    weddingId: string,
    filter: TaskListFilter,
    page: PageQuery,
  ): Promise<{ items: TaskRecord[]; total: number }> {
    await connectToDatabase();
    const query: QueryFilter<TaskDoc> = { weddingId: toObjectId(weddingId, "weddingId") };
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.eventId !== undefined) query.eventId = optionalId(filter.eventId, "eventId");
    if (filter.assignedMembershipId !== undefined) {
      query.assignedMembershipId = optionalId(filter.assignedMembershipId, "assignedMembershipId");
    }
    const [items, total] = await Promise.all([
      TaskModel.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pageSkip(page))
        .limit(page.limit)
        .lean<TaskRecord[]>()
        .exec(),
      TaskModel.countDocuments(query).exec(),
    ]);
    return { items, total };
  },

  async findById(weddingId: string, taskId: string): Promise<TaskRecord | null> {
    await connectToDatabase();
    return TaskModel.findOne(byId(weddingId, taskId)).lean<TaskRecord>().exec();
  },

  async create(weddingId: string, input: TaskFields): Promise<TaskRecord> {
    await connectToDatabase();
    const doc = await TaskModel.create({
      ...toDocFields(input),
      weddingId: toObjectId(weddingId, "weddingId"),
    });
    return doc.toObject() as TaskRecord;
  },

  /**
   * Applies `changes` when `__v` is still `expectedVersion` and bumps the
   * version. Null → the caller works out NOT_FOUND or CONFLICT.
   */
  async updateVersioned(
    weddingId: string,
    taskId: string,
    expectedVersion: number,
    changes: Partial<TaskFields>,
  ): Promise<TaskRecord | null> {
    await connectToDatabase();
    return TaskModel.findOneAndUpdate(
      { ...byId(weddingId, taskId), __v: expectedVersion },
      { $set: toDocFields(changes), $inc: { __v: 1 } },
      { returnDocument: "after", runValidators: true },
    )
      .lean<TaskRecord>()
      .exec();
  },

  async delete(weddingId: string, taskId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await TaskModel.deleteOne(byId(weddingId, taskId)).exec();
    return result.deletedCount === 1;
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
