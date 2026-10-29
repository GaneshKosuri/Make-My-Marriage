import { MEMBER_INVITATION_TTL_DAYS } from "@/modules/members/member.constants";

/**
 * Copy for Settings → Wedding Members (PRD §9.4; Stitch prompt 10 wording,
 * dashboard visual style). Kept in one place so the screen and its tests agree.
 */

export const MEMBERS = {
  eyebrow: "Settings",
  title: "Wedding Members",
  description: "The family members planning this wedding with you.",
  roles: "Admins manage everything, including members. Managers help with everything else.",
  managerNote: "Only Admins can invite, change roles or remove members.",

  invite: "Invite member",
  you: "You",
  joined: (date: string) => `Joined ${date}`,
  listTitle: "Members",
  listDescription: (count: number) => (count === 1 ? "1 person" : `${count} people`),
  makeAdmin: "Make Admin",
  makeManager: "Make Manager",
  remove: "Remove",
  leave: "Leave wedding",
  lastAdmin: "A wedding must keep at least one Admin.",
  loadError: {
    title: "We couldn't load the members.",
    retry: "Try again",
  },

  invitationsTitle: "Pending invitations",
  invitationsDescription: `Invitation links work for ${MEMBER_INVITATION_TTL_DAYS} days.`,
  noInvitations: "No invitations waiting. Invite a family member to plan with you.",
  expires: (date: string) => `Expires ${date}`,
  resend: "Resend",
  resending: "Sending…",
  revoke: "Revoke",
  resent: (email: string) => `We've sent a new invitation to ${email}.`,

  inviteDialog: {
    title: "Invite a family member",
    description:
      "We'll email them a link to join. They sign up or sign in with this email address.",
    email: "Email address",
    role: "Role",
    roleHints: {
      MANAGER: "Helps with events, tasks, guests and everything else.",
      ADMIN: "Can also invite, change roles and remove members.",
    },
    submit: "Send invitation",
    pending: "Sending…",
    cancel: "Cancel",
    sent: (email: string) => `Invitation sent to ${email}.`,
    emailFailed: {
      title: "We couldn't send the email.",
      description: "Nothing was sent. Please try again in a moment.",
    },
  },

  confirm: {
    removeTitle: (name: string) => `Remove ${name}?`,
    removeDescription:
      "They lose access to this wedding straight away. You can invite them again later.",
    leaveTitle: "Leave this wedding?",
    leaveDescription: "You lose access straight away. Another Admin can invite you again later.",
    demoteSelfTitle: "Become a Manager?",
    demoteSelfDescription:
      "You will no longer be able to invite, change roles or remove members. Another Admin can make you an Admin again.",
    cancel: "Cancel",
  },

  genericError: {
    title: "Something went wrong.",
    description: "Please check your connection and try again.",
  },
  tooManyInvites: {
    title: "Too many invitations for now.",
    description: "Please wait a while before sending more.",
  },
} as const;
