/**
 * Isomorphic ObjectId validation. Malformed ids must be rejected as a 400
 * VALIDATION_ERROR before they reach Mongoose (API_DESIGN §95). The server
 * re-exports this from `@/server/db/object-id` alongside `toObjectId()`.
 */
import { z } from "zod";

export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const objectId = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");

export function isObjectIdString(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}
