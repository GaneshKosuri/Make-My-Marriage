import { PASSWORD_MIN_LENGTH, PASSWORD_RESET_TTL_MINUTES } from "@/modules/auth/auth.constants";

/**
 * Copy for the sign-in, sign-up and password-reset screens (Stitch auth designs,
 * PRD §9.1). Kept in one place so the pages and their tests agree.
 */

export const AUTH_ROUTES = {
  signIn: "/login",
  signUp: "/signup",
  forgotPassword: "/forgot-password",
  /** Where a signed-in member lands. */
  app: "/app",
  /** Where a signed-in user without a wedding lands (PRD §9.2). */
  createWedding: "/create-wedding",
} as const;

/** The sample couple shown on the brand panel, matching the home page. */
export const AUTH_SHOWCASE = {
  eyebrow: "Celebrating the wedding of",
  couple: "Romeo & Juliet",
  details: "14 February 2027 · Dehradun",
  tagline: "One calm space for your family to plan the wedding together.",
} as const;

export const AUTH_FOOTER = "© 2026 Make My Marriage";

export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters`;
export const RESET_LINK_NOTE = `Reset links work once and expire after ${PASSWORD_RESET_TTL_MINUTES} minutes.`;

export const SIGN_IN = {
  title: "Welcome back",
  description: "Sign in to your wedding workspace.",
  submit: "Sign in",
  pending: "Signing in…",
  forgotPassword: "Forgot password?",
  newHere: "New here?",
  createAccount: "Create an account",
  invalidCredentials: {
    title: "Invalid email or password.",
    description: "Please re-check your credentials and try again.",
  },
  tooManyAttempts: {
    title: "Too many sign-in attempts.",
    description: "Please wait a few minutes and try again.",
  },
  guestNote: {
    title: "Attending as a guest?",
    description:
      "Guests don't need an account. Open the invitation link your family shared with you on WhatsApp or email.",
  },
} as const;

export const SIGN_UP = {
  eyebrow: "Get started",
  title: "Create your account",
  description: "Start planning your wedding together.",
  submit: "Create account",
  pending: "Creating account…",
  alreadyHaveAccount: "Already coordinating?",
  signIn: "Sign in",
  namePlaceholder: "e.g. Vikram Malhotra",
  passwordPlaceholder: "Create a password",
  emailTaken: {
    title: "An account with this email already exists.",
    action: "Sign in instead",
  },
  tooManyAttempts: {
    title: "Too many attempts.",
    description: "Please wait a few minutes and try again.",
  },
} as const;

export const FORGOT_PASSWORD = {
  back: "Back to sign in",
  title: "Reset your password",
  description: "Enter your email and we'll send you a link to set a new one.",
  submit: "Send reset link",
  pending: "Sending…",
  sent: {
    title: "Check your email",
    /** Same wording whether or not the account exists (API_DESIGN §15). */
    description: (email: string) =>
      [
        "If an account exists for ",
        email,
        `, we've sent a link to reset your password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
      ] as const,
    resend: "Didn't get it? Send again",
    resent: "We've sent another link.",
  },
  tooManyAttempts: {
    title: "Too many reset requests.",
    description: "Please wait a few minutes and try again.",
  },
} as const;

export const RESET_PASSWORD = {
  title: "Set a new password",
  description: "Choose a new password for your account.",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
  submit: "Save new password",
  pending: "Saving…",
  expired: {
    title: "This link has expired",
    description: `Reset links work once and expire after ${PASSWORD_RESET_TTL_MINUTES} minutes. Request a new one to continue.`,
  },
  invalid: {
    title: "This link can't be used",
    description:
      "It may have been used already or copied incorrectly. Request a new one to continue.",
  },
  requestNew: "Send a new link",
  success: {
    title: "Password updated",
    description: "You can now sign in with your new password.",
    action: "Sign in",
  },
} as const;

export const GENERIC_ERROR = {
  title: "Something went wrong.",
  description: "Please check your connection and try again.",
} as const;
