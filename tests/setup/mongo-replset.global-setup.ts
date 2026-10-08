import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * One in-memory single-node replica set for the integration project
 * (transactions need a replica set). Each test file gets its own database
 * (see integration.setup.ts).
 */
let replSet: MongoMemoryReplSet | undefined;

export async function setup(project: TestProject): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  project.provide("mongoUri", replSet.getUri());
}

export async function teardown(): Promise<void> {
  await replSet?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
