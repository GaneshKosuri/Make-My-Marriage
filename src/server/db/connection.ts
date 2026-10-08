import "server-only";

import mongoose, { type Connection } from "mongoose";

import { getEnv } from "@/server/config/env";
import { logger } from "@/server/logging/logger";

/**
 * One Mongoose connection per process, cached on globalThis so it survives
 * dev hot reloads and is reused across serverless invocations on the same
 * instance (SYSTEM_DESIGN §55). Repositories call `connectToDatabase()` before
 * querying; commands are never buffered while disconnected.
 */

interface MongooseCache {
  connection: Connection | null;
  promise: Promise<Connection> | null;
}

const globalForMongoose = globalThis as typeof globalThis & { __mmmMongoose?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.__mmmMongoose ??= {
  connection: null,
  promise: null,
});

const CONNECTED = 1;

export class DatabaseNotConfiguredError extends Error {
  override readonly name = "DatabaseNotConfiguredError";
  constructor() {
    super("MONGODB_URI is not set. Copy .env.example to .env.local and configure a database.");
  }
}

export async function connectToDatabase(): Promise<Connection> {
  if (cache.connection?.readyState === CONNECTED) return cache.connection;

  if (!cache.promise) {
    const { MONGODB_URI } = getEnv();
    if (!MONGODB_URI) throw new DatabaseNotConfiguredError();

    mongoose.set("strictQuery", true);
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5_000,
        // Unique/TTL indexes are part of correctness (e.g. one account per
        // email), so let Mongoose ensure them. See "Open decisions".
        autoIndex: true,
        autoCreate: true,
      })
      .then((instance) => instance.connection)
      .catch((error: unknown) => {
        cache.promise = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

/** True when MongoDB answers a ping. Never throws (used by /api/health). */
export async function pingDatabase(): Promise<boolean> {
  try {
    const connection = await connectToDatabase();
    await connection.db?.admin().ping();
    return true;
  } catch (error) {
    logger.warn("Database ping failed", { error });
    return false;
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  cache.promise = null;
  cache.connection = null;
  await mongoose.disconnect();
}
