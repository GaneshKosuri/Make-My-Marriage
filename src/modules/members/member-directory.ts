import "server-only";

import { getIdentity, type IdentityUser } from "@/server/auth";

/**
 * Users belong to the auth module, so names and emails come through the
 * identity directory port. Weddings have a handful of members, so one lookup
 * per user is fine.
 */
export async function loadUsers(userIds: readonly string[]): Promise<Map<string, IdentityUser>> {
  const { directory } = getIdentity();
  const users = await Promise.all([...new Set(userIds)].map((id) => directory.findUserById(id)));
  return new Map(users.filter((user) => user !== null).map((user) => [user.id, user]));
}
