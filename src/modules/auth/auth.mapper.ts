import "server-only";

import type { IdentityUser } from "@/server/auth/identity";

import type { AuthResultDto, MeDto, PublicUserDto } from "./auth.types";
import type { UserRecord } from "./user.model";
import type { WeddingContext } from "./wedding-context";

/** Document → DTO. Strips secrets: passwordHash and emailNormalized never leave the server. */
export function toPublicUserDto(user: UserRecord): PublicUserDto {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export function toIdentityUser(user: UserRecord): IdentityUser {
  return toPublicUserDto(user);
}

/** API_DESIGN §11–12 */
export function toAuthResultDto(user: UserRecord, hasWedding: boolean): AuthResultDto {
  return { user: toPublicUserDto(user), hasWedding };
}

/** API_DESIGN §14 */
export function toMeDto(user: UserRecord, context: WeddingContext | null): MeDto {
  return {
    user: toPublicUserDto(user),
    membership: context ? { role: context.membership.role } : null,
    wedding: context
      ? {
          id: context.wedding.id,
          brideName: context.wedding.brideName,
          groomName: context.wedding.groomName,
          weddingDate: context.wedding.weddingDate,
        }
      : null,
  };
}
