/** Auth DTOs and inputs (API_DESIGN §11–16). Isomorphic. */

import type { z } from "zod";

import type { MemberRole } from "@/modules/members/member.constants";

import type {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./auth.schemas";

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

export type SignupInput = z.output<typeof signupSchema>;
export type LoginInput = z.output<typeof loginSchema>;
export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;
