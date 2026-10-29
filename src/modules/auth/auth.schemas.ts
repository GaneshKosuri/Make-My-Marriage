import { z } from "zod";

import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_NAME_MAX_LENGTH,
} from "./auth.constants";

/**
 * Auth request schemas (Zod, `.strict()`). Isomorphic: the login/signup forms
 * reuse them with React Hook Form. Messages are shown to users as-is.
 */

/** Shared with member invitations (one definition of a valid email address). */
export const emailField = z
  .string()
  .trim()
  .max(EMAIL_MAX_LENGTH, "Email address is too long")
  .pipe(z.email("Enter a valid email address"));

/** Never trimmed: spaces are part of the password. */
const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);

/** API_DESIGN §11 */
export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter your full name")
      .max(USER_NAME_MAX_LENGTH, "Name is too long"),
    email: emailField,
    password: newPasswordField,
  })
  .strict();

/** API_DESIGN §12. No minimum beyond "present": length rules apply when setting a password. */
export const loginSchema = z
  .object({
    email: emailField,
    password: z.string().min(1, "Enter your password").max(PASSWORD_MAX_LENGTH, "Invalid password"),
  })
  .strict();

/** API_DESIGN §15 */
export const forgotPasswordSchema = z.object({ email: emailField }).strict();

/**
 * API_DESIGN §16. The token is only bounded here; the service answers
 * INVALID_TOKEN for anything malformed, so a bad link never looks like a form error.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().max(256),
    password: newPasswordField,
  })
  .strict();
