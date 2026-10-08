import "server-only";

import type { RenderedEmail } from "../types";

import { escapeHtml, renderButton, renderLayout, safeUrl } from "./layout";

export interface MemberInvitationEmailProps {
  inviterName: string;
  /** e.g. "Akshay & Princi" */
  coupleNames: string;
  /** Human label, e.g. "Manager" */
  roleLabel: string;
  acceptUrl: string;
  /** Already formatted for display, e.g. "21 October 2026" */
  expiresOn: string;
}

/** SYSTEM_DESIGN §18–19, PRD §9.4. Placeholder copy. */
export function renderMemberInvitationEmail(props: MemberInvitationEmailProps): RenderedEmail {
  const url = safeUrl(props.acceptUrl);
  const subject = `${props.inviterName} invited you to help plan ${props.coupleNames}'s wedding`;
  const text = [
    `${props.inviterName} has invited you to join ${props.coupleNames}'s wedding on Make My Marriage as a ${props.roleLabel}.`,
    "",
    "Accept the invitation:",
    url,
    "",
    `This invitation expires on ${props.expiresOn}.`,
  ].join("\n");
  const html = renderLayout({
    preheader: `Join ${props.coupleNames}'s wedding workspace`,
    bodyHtml: `<p>${escapeHtml(props.inviterName)} has invited you to join <strong>${escapeHtml(props.coupleNames)}</strong>'s wedding on Make My Marriage as a ${escapeHtml(props.roleLabel)}.</p>
      ${renderButton(url, "Accept invitation")}
      <p>This invitation expires on ${escapeHtml(props.expiresOn)}.</p>`,
  });
  return { subject, html, text };
}
