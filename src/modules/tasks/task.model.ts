import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TITLE_MAX_LENGTH,
  type TaskPriority,
  type TaskStatus,
} from "./task.constants";

/**
 * `tasks` (DATABASE_DESIGN §36–40). Assigned to a membership (not a user) so
 * same-wedding validation is explicit. Hard-deleted. Updates are conditional
 * on `__v` (optimistic concurrency → CONFLICT).
 */
export interface TaskDoc {
  weddingId: Types.ObjectId;
  title: string;
  description: string | null;
  assignedMembershipId: Types.ObjectId | null;
  eventId: Types.ObjectId | null;
  dueDate: Date | null;
  priority: TaskPriority;
  status: TaskStatus;
  /** Server-owned: set when status becomes COMPLETED, cleared when it leaves it. */
  completedAt: Date | null;
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskRecord = WithId<TaskDoc>;

const taskSchema = new Schema<TaskDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    title: { type: String, required: true, trim: true, maxlength: TASK_TITLE_MAX_LENGTH },
    description: {
      type: String,
      trim: true,
      maxlength: TASK_DESCRIPTION_MAX_LENGTH,
      default: null,
    },
    assignedMembershipId: { type: Schema.Types.ObjectId, ref: "WeddingMembership", default: null },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    dueDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      required: true,
      default: DEFAULT_TASK_PRIORITY,
    },
    status: { type: String, enum: TASK_STATUSES, required: true, default: DEFAULT_TASK_STATUS },
    completedAt: { type: Date, default: null },
  },
  { ...baseSchemaOptions("tasks"), optimisticConcurrency: true },
);

taskSchema.index({ weddingId: 1, status: 1 }, { name: "weddingId_status" });
taskSchema.index({ weddingId: 1, dueDate: 1 }, { name: "weddingId_dueDate" });
taskSchema.index(
  { weddingId: 1, assignedMembershipId: 1, status: 1 },
  { name: "weddingId_assignedMembershipId_status" },
);
taskSchema.index({ weddingId: 1, eventId: 1 }, { name: "weddingId_eventId" });

taskSchema.plugin(tenantGuardPlugin);

export const TaskModel = defineModel<TaskDoc>("Task", taskSchema);
