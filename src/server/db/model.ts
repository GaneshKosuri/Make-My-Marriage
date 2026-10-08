import "server-only";

import { model, models, type Model, type Schema, type SchemaOptions, type Types } from "mongoose";

/** A lean document as returned by `.lean()` queries. */
export type WithId<T> = T & { _id: Types.ObjectId };

/**
 * Shared schema options: explicit collection name, createdAt/updatedAt, and
 * `strict: "throw"` so writes with unknown paths fail loudly instead of being
 * silently dropped (Zod already rejects unknown keys at the API boundary).
 */
export function baseSchemaOptions(collection: string): SchemaOptions {
  return { collection, timestamps: true, strict: "throw" };
}

/**
 * Returns the already-compiled model when it exists, so dev hot reloads and
 * repeated imports never recompile (`OverwriteModelError`).
 */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}
