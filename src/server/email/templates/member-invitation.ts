import "server-only";

import type { RenderedEmail } from "../types";

import { withArticle } from "@/lib/text";

import {
  escapeHtml,
  renderButton,
  renderDetails,
  renderLayout,
  renderNote,
  renderParagraph,
  safeUrl,
} from "./layout";

export interface MemberInvitationEmailProps {
  inviterName: string;
  /** e.g. "Akshay & Princi" */
  coupleNames: string;
  /** Human label, e.g. "Manager" */
  roleLabel: string;
  acceptUrl: string;
  /** Already formatted for display, e.g. "21 October 2026" */
  expiresOn: string;
  /** A resent invitation: the subject starts with "Reminder:" and the old link no longer works. */
  reminder?: boolean;
}

/** SYSTEM_DESIGN §18–19, PRD §9.4. */
export function renderMemberInvitationEmail(props: MemberInvitationEmailProps): RenderedEmail {
  const url = safeUrl(props.acceptUrl);
  const role = withArticle(props.roleLabel);
  const subject = `${props.reminder ? "Reminder: " : ""}${props.inviterName} invited you to help plan ${props.coupleNames}'s wedding`;
  const replaces = props.reminder
    ? "This link replaces the one in any earlier invitation email."
    : null;
  const text = [
    `${props.inviterName} has invited you to join ${props.coupleNames}'s wedding on Make My Marriage as ${role}.`,
    "",
    "Accept the invitation:",
    url,
    "",
    `This invitation expires on ${props.expiresOn}.`,
    ...(replaces ? [replaces] : []),
  ].join("\n");
  const html = renderLayout({
    preheader: `${props.inviterName} invited you to help plan ${props.coupleNames}'s wedding`,
    eyebrow: props.reminder ? "Reminder" : "You're invited",
    title: `Help plan ${props.coupleNames}'s wedding`,
    bodyHtml: `${renderParagraph(`${escapeHtml(props.inviterName)} has invited you to join <strong>${escapeHtml(props.coupleNames)}</strong>'s wedding on Make My Marriage as ${escapeHtml(role)}.`)}
      ${renderParagraph("Plan the ceremonies, share tasks and keep the whole family on the same page.")}
      ${renderDetails([
        ["Wedding", props.coupleNames],
        ["Your role", props.roleLabel],
        ["Invited by", props.inviterName],
        ["Link expires", props.expiresOn],
      ])}
      ${renderButton(url, "Accept invitation")}
      ${replaces ? renderNote(escapeHtml(replaces)) : ""}`,
    footnote:
      "You received this because someone invited this email address. If you weren't expecting it, you can ignore it.",
  });
  return { subject, html, text };
}
