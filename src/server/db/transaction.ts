import "server-only";

import type { ClientSession } from "mongoose";

import { connectToDatabase } from "./connection";

/**
 * Runs `work` inside a MongoDB transaction, retrying transient errors
 * (Mongoose `connection.transaction`). Requires a replica set.
 *
 * Use it only for the documented multi-write operations (DATABASE_DESIGN §84–86):
 *   - create wedding + initial ADMIN membership
 *   - accept member invitation (create membership + mark ACCEPTED)
 * Pass `session` to every query/save inside `work`.
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const connection = await connectToDatabase();
  return connection.transaction(work);
}
