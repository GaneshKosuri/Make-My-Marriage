import "server-only";

import { Schema, type Types } from "mongoose";

import { baseSchemaOptions, defineModel, type WithId } from "@/server/db/model";
import { tenantGuardPlugin } from "@/server/db/plugins/tenant-guard";

import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_DRESS_CODE_MAX_LENGTH,
  EVENT_NAME_MAX_LENGTH,
  EVENT_TYPES,
  EVENT_VENUE_NAME_MAX_LENGTH,
  type EventType,
} from "./event.constants";

/**
 * `events` (DATABASE_DESIGN §31–35). Timestamps are UTC instants rendered in
 * Wedding.timeZone. Archived (archivedAt), never hard-deleted, because tasks,
 * guests, vendors, expenses and photos reference events.
 * Updates are conditional on `__v` (optimistic concurrency → CONFLICT).
 */
export interface EventDoc {
  weddingId: Types.ObjectId;
  name: string;
  type: EventType | null;
  startsAt: Date;
  endsAt: Date | null;
  venueName: string | null;
  address: string | null;
  description: string | null;
  dressCode: string | null;
  coverImageObjectKey: string | null;
  archivedAt: Date | null;
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EventRecord = WithId<EventDoc>;

const eventSchema = new Schema<EventDoc>(
  {
    weddingId: { type: Schema.Types.ObjectId, ref: "Wedding", required: true },
    name: { type: String, required: true, trim: true, maxlength: EVENT_NAME_MAX_LENGTH },
    // Optional preset; built-in enum validators skip null.
    type: { type: String, enum: EVENT_TYPES, default: null },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    venueName: { type: String, trim: true, maxlength: EVENT_VENUE_NAME_MAX_LENGTH, default: null },
    address: { type: String, trim: true, maxlength: EVENT_ADDRESS_MAX_LENGTH, default: null },
    description: {
      type: String,
      trim: true,
      maxlength: EVENT_DESCRIPTION_MAX_LENGTH,
      default: null,
    },
    dressCode: { type: String, trim: true, maxlength: EVENT_DRESS_CODE_MAX_LENGTH, default: null },
    coverImageObjectKey: { type: String, default: null },
    archivedAt: { type: Date, default: null },
  },
  { ...baseSchemaOptions("events"), optimisticConcurrency: true },
);

eventSchema.index({ weddingId: 1, startsAt: 1 }, { name: "weddingId_startsAt" });
eventSchema.index({ weddingId: 1, archivedAt: 1 }, { name: "weddingId_archivedAt" });

eventSchema.plugin(tenantGuardPlugin);

export const EventModel = defineModel<EventDoc>("Event", eventSchema);
