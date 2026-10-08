import "server-only";

import { Types } from "mongoose";

import { OBJECT_ID_PATTERN } from "@/lib/object-id";
import { AppError } from "@/server/errors";

export { isObjectIdString, objectId, OBJECT_ID_PATTERN } from "@/lib/object-id";

/**
 * Converts a validated id string to an ObjectId. Malformed input becomes a 400
 * VALIDATION_ERROR and never reaches a Mongoose query (API_DESIGN §95).
 */
export function toObjectId(id: string, field = "id"): Types.ObjectId {
  if (!OBJECT_ID_PATTERN.test(id)) {
    throw new AppError("VALIDATION_ERROR", undefined, { details: { [field]: "Invalid id" } });
  }
  return new Types.ObjectId(id);
}
