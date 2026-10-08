import "server-only";

import { renderGuestInvitationEmail, type GuestInvitationEmailProps } from "./guest-invitation";
import { renderMemberInvitationEmail, type MemberInvitationEmailProps } from "./member-invitation";
import { renderPasswordResetEmail, type PasswordResetEmailProps } from "./password-reset";
import { renderRsvpReminderEmail, type RsvpReminderEmailProps } from "./rsvp-reminder";

/** Every email the app sends (SYSTEM_DESIGN §44). */
export interface EmailTemplateProps {
  "password-reset": PasswordResetEmailProps;
  "member-invitation": MemberInvitationEmailProps;
  "guest-invitation": GuestInvitationEmailProps;
  "rsvp-reminder": RsvpReminderEmailProps;
}

export type EmailTemplateName = keyof EmailTemplateProps;

export const emailTemplates = {
  "password-reset": renderPasswordResetEmail,
  "member-invitation": renderMemberInvitationEmail,
  "guest-invitation": renderGuestInvitationEmail,
  "rsvp-reminder": renderRsvpReminderEmail,
} satisfies { [K in EmailTemplateName]: (props: EmailTemplateProps[K]) => unknown };

export type {
  GuestInvitationEmailProps,
  MemberInvitationEmailProps,
  PasswordResetEmailProps,
  RsvpReminderEmailProps,
};
