/**
 * Auth DTOs and inputs (API_DESIGN §11–16). Isomorphic.
 * TODO(Phase 1): derive the input types from ./auth.schemas.ts with z.infer once the schemas exist.
 */

import type { MemberRole } from "@/modules/members/member.constants";

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
}

/** Signup / login response (API_DESIGN §11–12). */
export interface AuthResultDto {
  user: PublicUserDto;
  hasWedding: boolean;
}

/** GET /api/auth/me (API_DESIGN §14). */
export interface MeDto {
  user: PublicUserDto;
  membership: { role: MemberRole } | null;
  wedding: {
    id: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
  } | null;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
