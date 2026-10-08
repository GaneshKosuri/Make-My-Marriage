import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";

import { MembershipModel } from "@/modules/members/membership.model";
import { WeddingModel } from "@/modules/weddings/wedding.model";
import { connectToDatabase } from "@/server/db/connection";
import { withTransaction } from "@/server/db/transaction";

beforeAll(async () => {
  await connectToDatabase();
  // Collections must exist before multi-document transactions on older servers.
  await Promise.all([WeddingModel.createCollection(), MembershipModel.createCollection()]);
});

function weddingDoc(slug: string, createdByUserId: Types.ObjectId) {
  return {
    brideName: "Princi",
    groomName: "Akshay",
    weddingDate: "2027-02-14",
    website: { slug },
    gallery: { token: `gallery-token-${slug}` },
    createdByUserId,
  };
}

describe("withTransaction (DATABASE_DESIGN §84–86)", () => {
  it("commits a wedding and its first ADMIN membership together", async () => {
    const userId = new Types.ObjectId();
    const weddingId = await withTransaction(async (session) => {
      const [wedding] = await WeddingModel.create([weddingDoc("committed-slug", userId)], {
        session,
      });
      if (!wedding) throw new Error("not created");
      await MembershipModel.create([{ weddingId: wedding._id, userId, role: "ADMIN" }], {
        session,
      });
      return wedding._id;
    });

    expect(await WeddingModel.exists({ _id: weddingId })).not.toBeNull();
    expect(await MembershipModel.exists({ weddingId, userId })).not.toBeNull();
  });

  it("rolls back every write when the operation fails", async () => {
    const userId = new Types.ObjectId();
    await expect(
      withTransaction(async (session) => {
        const [wedding] = await WeddingModel.create([weddingDoc("rolled-back-slug", userId)], {
          session,
        });
        if (!wedding) throw new Error("not created");
        await MembershipModel.create([{ weddingId: wedding._id, userId, role: "ADMIN" }], {
          session,
        });
        throw new Error("membership step failed");
      }),
    ).rejects.toThrow("membership step failed");

    expect(await WeddingModel.exists({ "website.slug": "rolled-back-slug" })).toBeNull();
    expect(await MembershipModel.exists({ userId }).setOptions({ tenantScoped: false })).toBeNull();
  });
});
