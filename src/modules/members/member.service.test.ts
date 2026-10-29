import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/server/auth";

/**
 * membersService rules that need a race to show up. Everything that runs
 * against MongoDB (listing, LAST_ADMIN, cross-wedding NOT_FOUND, invitations
 * and accept) is covered in tests/integration/members.test.ts.
 */

const repository = {
  findById: vi.fn(),
  countAdmins: vi.fn(),
  updateRole: vi.fn(),
  delete: vi.fn(),
  restore: vi.fn(),
};
vi.mock("./membership.repository", () => ({ membershipRepository: repository }));
vi.mock("./member-directory", () => ({
  loadUsers: async (ids: string[]) =>
    new Map(ids.map((id) => [id, { id, name: "Akshay Saini", email: "akshay@example.com" }])),
}));

const { membersService } = await import("./member.service");

const ctx: MemberContext = {
  requestId: "r1",
  userId: "65abc00000000000000000c1",
  membershipId: "65abc00000000000000000b1",
  weddingId: "65abc00000000000000000a1",
  role: "ADMIN",
};

const admin = {
  _id: new Types.ObjectId("65abc00000000000000000b2"),
  weddingId: new Types.ObjectId(ctx.weddingId),
  userId: new Types.ObjectId("65abc00000000000000000c2"),
  role: "ADMIN" as const,
  joinedAt: new Date("2026-10-01T00:00:00Z"),
};
const membershipId = admin._id.toString();

beforeEach(() => {
  vi.clearAllMocks();
  repository.findById.mockResolvedValue(admin);
});

describe("membersService: two Admins acting at the same moment", () => {
  it("undoes a demotion that left the wedding without an Admin", async () => {
    // Two Admins before the write; none after (the other Admin was demoted at the same time).
    repository.countAdmins.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    repository.updateRole.mockResolvedValue({ ...admin, role: "MANAGER" });

    await expect(
      membersService.changeRole(ctx, membershipId, { role: "MANAGER" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
    expect(repository.updateRole).toHaveBeenLastCalledWith(ctx.weddingId, membershipId, "ADMIN");
  });

  it("undoes a removal that left the wedding without an Admin", async () => {
    repository.countAdmins.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    repository.delete.mockResolvedValue(true);

    await expect(membersService.removeMember(ctx, membershipId)).rejects.toMatchObject({
      code: "LAST_ADMIN",
    });
    expect(repository.restore).toHaveBeenCalledWith(ctx.weddingId, admin);
  });

  it("keeps a demotion when another Admin remains", async () => {
    repository.countAdmins.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    repository.updateRole.mockResolvedValue({ ...admin, role: "MANAGER" });

    const result = await membersService.changeRole(ctx, membershipId, { role: "MANAGER" });
    expect(result.role).toBe("MANAGER");
    expect(repository.updateRole).toHaveBeenCalledTimes(1);
  });

  it("does not write when the role is unchanged", async () => {
    const result = await membersService.changeRole(ctx, membershipId, { role: "ADMIN" });
    expect(result.role).toBe("ADMIN");
    expect(repository.updateRole).not.toHaveBeenCalled();
    expect(repository.countAdmins).not.toHaveBeenCalled();
  });
});
