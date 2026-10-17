/**
 * Local development database: a single-node MongoDB replica set (transactions
 * need one) on 127.0.0.1:27017, with data kept in ./.mongo-data.
 *
 *   npm run db:dev        # leave it running in its own terminal
 *
 * Uses the mongod binary that mongodb-memory-server downloads for the
 * integration tests, so nothing needs installing. Point .env.local at:
 *   MONGODB_URI=mongodb://127.0.0.1:27017/make-my-marriage-dev?replicaSet=rs0
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { MongoClient } from "mongodb";
import { MongoBinary } from "mongodb-memory-server";

const PORT = 27017;
const REPLICA_SET = "rs0";
const DB_PATH = resolve(".mongo-data");
const MEMBER = `127.0.0.1:${PORT}`;

mkdirSync(DB_PATH, { recursive: true });
const binary = await MongoBinary.getPath();

const mongod = spawn(
  binary,
  ["--replSet", REPLICA_SET, "--dbpath", DB_PATH, "--port", String(PORT), "--bind_ip", "127.0.0.1"],
  { stdio: ["ignore", "ignore", "inherit"] },
);
mongod.on("exit", (code) => {
  console.error(`mongod exited (code ${code}). Is something else already using port ${PORT}?`);
  process.exit(code ?? 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => mongod.kill());
}

/** Waits for mongod, then initiates the replica set the first time only. */
async function ensureReplicaSet() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const client = new MongoClient(`mongodb://${MEMBER}/?directConnection=true`, {
      serverSelectionTimeoutMS: 1000,
    });
    try {
      await client.connect();
      const admin = client.db("admin");
      try {
        await admin.command({ replSetGetStatus: 1 });
      } catch (error) {
        if (error?.codeName !== "NotYetInitialized") throw error;
        await admin.command({
          replSetInitiate: { _id: REPLICA_SET, members: [{ _id: 0, host: MEMBER }] },
        });
      }
      return;
    } catch (error) {
      if (attempt === 59) throw error;
      await new Promise((done) => setTimeout(done, 500));
    } finally {
      await client.close();
    }
  }
}

await ensureReplicaSet();
console.log(
  `MongoDB replica set "${REPLICA_SET}" ready on ${MEMBER} (data: ${DB_PATH}). Ctrl+C to stop.`,
);
