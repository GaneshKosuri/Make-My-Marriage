import "server-only";

import type { IdentityUser } from "@/server/auth/identity";

import type { PublicUserDto } from "./auth.types";
import type { UserRecord } from "./user.model";

/**
 * Document → DTO. Strips secrets: passwordHash and emailNormalized never leave the server.
 * TODO(Phase 1): add MeDto / AuthResultDto mapping (API_DESIGN §11–14).
 */
export function toPublicUserDto(user: UserRecord): PublicUserDto {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export function toIdentityUser(user: UserRecord): IdentityUser {
  return toPublicUserDto(user);
}
