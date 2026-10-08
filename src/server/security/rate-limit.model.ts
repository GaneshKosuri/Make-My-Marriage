import "server-only";

import { model, models, Schema, type Model } from "mongoose";

/**
 * Fixed-window rate-limit counters (SYSTEM_DESIGN §23, API_DESIGN §51).
 *
 * `_id` is an HMAC of (policy, window, subject), so raw tokens and IP addresses
 * are never stored. Documents expire through the TTL index once their window
 * has closed. This collection is the one addition to DATABASE_DESIGN §112
 * (binding decision 4).
 */
export interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rateLimitSchema = new Schema<RateLimitDoc>(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "rate_limits", timestamps: true, versionKey: false },
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });

export const RateLimitModel: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc> | undefined) ??
  model<RateLimitDoc>("RateLimit", rateLimitSchema);
