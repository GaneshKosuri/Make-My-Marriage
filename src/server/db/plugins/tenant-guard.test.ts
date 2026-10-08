import { Mongoose, Schema, Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  assertTenantScopedFilter,
  assertTenantScopedPipeline,
  tenantGuardPlugin,
  TenantScopeError,
} from "./tenant-guard";

describe("assertTenantScopedFilter", () => {
  const weddingId = new Types.ObjectId();

  it("accepts filters scoped by weddingId", () => {
    expect(() => assertTenantScopedFilter("Task", "find", { weddingId }, {})).not.toThrow();
    expect(() =>
      assertTenantScopedFilter("Task", "find", { weddingId: { $in: [weddingId] } }, {}),
    ).not.toThrow();
  });

  it("throws on missing or null weddingId", () => {
    expect(() => assertTenantScopedFilter("Task", "findOne", { _id: weddingId }, {})).toThrow(
      TenantScopeError,
    );
    expect(() => assertTenantScopedFilter("Task", "find", {}, {})).toThrow(TenantScopeError);
    expect(() => assertTenantScopedFilter("Task", "find", undefined, {})).toThrow(TenantScopeError);
    expect(() => assertTenantScopedFilter("Task", "find", { weddingId: null }, {})).toThrow(
      TenantScopeError,
    );
  });

  it("allows an explicit opt-out", () => {
    expect(() =>
      assertTenantScopedFilter(
        "Guest",
        "findOne",
        { invitationToken: "t" },
        { tenantScoped: false },
      ),
    ).not.toThrow();
  });

  it("requires aggregations to start with $match on weddingId", () => {
    expect(() => assertTenantScopedPipeline("Expense", [{ $match: { weddingId } }])).not.toThrow();
    expect(() => assertTenantScopedPipeline("Expense", [{ $group: { _id: "$category" } }])).toThrow(
      TenantScopeError,
    );
    expect(() => assertTenantScopedPipeline("Expense", [])).toThrow(TenantScopeError);
  });
});

describe("tenantGuardPlugin on a model", () => {
  // An unconnected Mongoose instance: the guard runs in pre-hooks, before any driver call.
  const mongoose = new Mongoose();
  const schema = new Schema(
    { weddingId: Schema.Types.ObjectId, name: String },
    { bufferCommands: false },
  );
  schema.plugin(tenantGuardPlugin);
  const Thing = mongoose.model("GuardedThing", schema);
  const weddingId = new Types.ObjectId();

  it.each([
    ["find", () => Thing.find({ name: "x" }).exec()],
    ["findOne", () => Thing.findOne({ name: "x" }).exec()],
    ["findById", () => Thing.findById(new Types.ObjectId()).exec()],
    ["countDocuments", () => Thing.countDocuments({}).exec()],
    ["updateOne", () => Thing.updateOne({ name: "x" }, { name: "y" }).exec()],
    ["updateMany", () => Thing.updateMany({}, { name: "y" }).exec()],
    ["deleteOne", () => Thing.deleteOne({ name: "x" }).exec()],
    ["deleteMany", () => Thing.deleteMany({}).exec()],
    ["findOneAndUpdate", () => Thing.findOneAndUpdate({ name: "x" }, { name: "y" }).exec()],
    ["aggregate", () => Thing.aggregate([{ $group: { _id: null } }]).exec()],
  ])("blocks unscoped %s", async (_name, run) => {
    await expect(run()).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("lets scoped and opted-out queries through to the driver", async () => {
    // No connection, so they fail later — but not with TenantScopeError.
    await expect(Thing.find({ weddingId }).exec()).rejects.not.toBeInstanceOf(TenantScopeError);
    await expect(
      Thing.findOne({ name: "x" }).setOptions({ tenantScoped: false }).exec(),
    ).rejects.not.toBeInstanceOf(TenantScopeError);
  });
});
