import { randomBytes } from "node:crypto";

import mongoose from "mongoose";
import type * as NextServer from "next/server";
import { afterAll, beforeAll, inject, vi } from "vitest";

import { registerServerDependencies } from "@/composition-root";
import { resetEnvForTests } from "@/server/config/env";
import { disconnectFromDatabase } from "@/server/db/connection";

import { applyTestEnv } from "./test-env";

// `connection()` and `after()` need a Next.js request scope; tests call route
// handlers directly. `after` runs its task at once (not awaited), so assert on
// its effects with `vi.waitFor`.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof NextServer>()),
  connection: async () => undefined,
  after: (task: Promise<unknown> | (() => unknown)) => {
    void (typeof task === "function" ? task() : task);
  },
}));

/** A fresh database per test file on the shared in-memory replica set. */
function databaseUriForThisFile(): string {
  const url = new URL(inject("mongoUri"));
  url.pathname = `/mmm_test_${randomBytes(6).toString("hex")}`;
  return url.toString();
}

applyTestEnv();
process.env.MONGODB_URI = databaseUriForThisFile();
resetEnvForTests();

// Wire identity ports exactly as src/instrumentation.ts does in Next.js.
registerServerDependencies();

beforeAll(async () => {
  // A previous file in this worker may have left a connection open.
  if (mongoose.connection.readyState !== 0) await disconnectFromDatabase();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db?.dropDatabase();
  }
  await disconnectFromDatabase();
});
