import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";

import { TaskModel } from "@/modules/tasks/task.model";
import { connectToDatabase } from "@/server/db/connection";
import { TenantScopeError } from "@/server/db/plugins/tenant-guard";

const weddingA = new Types.ObjectId();
const weddingB = new Types.ObjectId();

beforeAll(async () => {
  await connectToDatabase();
  await TaskModel.create([
    { weddingId: weddingA, title: "Book photographer" },
    { weddingId: weddingA, title: "Order invitations" },
    { weddingId: weddingB, title: "Other wedding's task" },
  ]);
});

describe("tenant guard against a real MongoDB", () => {
  it("scoped queries return only that wedding's rows", async () => {
    const tasks = await TaskModel.find({ weddingId: weddingA }).lean();
    expect(tasks.map((task) => task.title).sort()).toEqual([
      "Book photographer",
      "Order invitations",
    ]);
  });

  it("unscoped queries are refused before reaching the database", async () => {
    const someTaskId = (await TaskModel.findOne({ weddingId: weddingB }).lean())?._id;
    await expect(TaskModel.findById(someTaskId).exec()).rejects.toBeInstanceOf(TenantScopeError);
    await expect(TaskModel.countDocuments({}).exec()).rejects.toBeInstanceOf(TenantScopeError);
    await expect(TaskModel.updateMany({}, { title: "pwned" }).exec()).rejects.toBeInstanceOf(
      TenantScopeError,
    );
    await expect(TaskModel.deleteMany({}).exec()).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("the tenantScoped:false opt-out works with the real driver", async () => {
    const all = await TaskModel.find({}).setOptions({ tenantScoped: false }).lean();
    expect(all).toHaveLength(3);
    const updated = await TaskModel.updateMany(
      { title: "Other wedding's task" },
      { $set: { priority: "HIGH" } },
    )
      .setOptions({ tenantScoped: false })
      .exec();
    expect(updated.modifiedCount).toBe(1);
  });

  it("aggregations must begin with $match on weddingId", async () => {
    const totals = await TaskModel.aggregate<{ count: number }>([
      { $match: { weddingId: weddingA } },
      { $count: "count" },
    ]);
    expect(totals[0]?.count).toBe(2);
    await expect(TaskModel.aggregate([{ $count: "count" }]).exec()).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });

  it("updates are version-checked (optimistic concurrency, binding decision 8)", async () => {
    const task = await TaskModel.findOne({ weddingId: weddingA, title: "Book photographer" });
    const stale = await TaskModel.findOne({ weddingId: weddingA, title: "Book photographer" });
    if (!task || !stale) throw new Error("fixture missing");
    task.status = "IN_PROGRESS";
    await task.save();
    stale.status = "COMPLETED";
    await expect(stale.save()).rejects.toMatchObject({ name: "VersionError" });
  });
});
