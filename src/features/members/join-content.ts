import { withArticle } from "@/lib/text";
import { MEMBER_INVITATION_TTL_DAYS, type MemberRole } from "@/modules/members/member.constants";

/**
 * Copy for /join/[token], the Wedding Member invitation page (PRD §9.4,
 * SYSTEM_DESIGN §19). Kept in one place so the screen and its tests agree.
 */

export const JOIN = {
  eyebrow: "You're invited",
  title: (couple: string) => `Help plan ${couple}'s wedding`,
  panelEyebrow: "You're invited to plan the wedding of",
  role: (role: string) => `as ${withArticle(role)}`,
  roleDescriptions: {
    ADMIN: "Admins manage everything, including who else can plan the wedding.",
    MANAGER: "Managers help with events, tasks, guests and everything else.",
  } satisfies Record<MemberRole, string>,
  invitedEmail: "Invitation for",

  createAccountTab: "Create an account",
  signInTab: "I have an account",
  signUpIntro: "New to Make My Marriage? Create your account to join.",
  signInIntro: "Sign in with the invited email address to join.",
  createAndJoin: "Create account and join",
  creating: "Creating account…",
  signInAndJoin: "Sign in and join",
  signingIn: "Signing in…",
  emailLocked: "Invitations work only for the email address they were sent to.",

  signedInAs: (name: string) => `Signed in as ${name}`,
  accept: "Join the wedding",
  accepting: "Joining…",

  emailTaken: {
    title: "You already have an account with this email.",
    action: "Sign in instead",
  },
  invalidCredentials: {
    title: "Invalid email or password.",
    description: "Please re-check your password and try again.",
  },
  tooManyAttempts: {
    title: "Too many attempts.",
    description: "Please wait a few minutes and try again.",
  },

  mismatch: {
    title: "This invitation is for a different email",
    description: (invited: string, current: string) =>
      [
        "It was sent to ",
        invited,
        ", but you're signed in as ",
        current,
        ". Sign out and continue with the invited email.",
      ] as const,
    action: "Sign out and continue",
  },
  alreadyHasWedding: {
    title: "You already belong to a wedding",
    description:
      "An account can plan one wedding at a time. To join this one, leave your current wedding first: Admins can leave from Wedding Members, and Managers ask an Admin there to remove them.",
    action: "Go to your dashboard",
  },

  ended: {
    invalid: {
      title: "This invitation is no longer valid",
      description:
        "It may have been cancelled, already used or copied incorrectly. Ask the person who invited you for a new one.",
    },
    expired: {
      title: "This invitation has expired",
      description: `Invitations last ${MEMBER_INVITATION_TTL_DAYS} days. Ask the person who invited you to send a new one.`,
    },
    accepted: {
      title: "This invitation has already been used",
      description: "If you joined already, sign in to open the wedding.",
    },
    signIn: "Go to sign in",
    dashboard: "Go to your dashboard",
    home: "Back to home",
  },

  unavailable: {
    title: "We couldn't load this invitation",
    description: "Please check your connection and reload the page.",
    action: "Reload",
  },
} as const;
