import "server-only";

import type { RenderedEmail } from "../types";

import { escapeHtml, renderButton, renderLayout, safeUrl } from "./layout";

export interface GuestInvitationEmailProps {
  guestName: string;
  coupleNames: string;
  /** Already formatted, e.g. "14 February 2027" */
  weddingDate: string;
  invitationUrl: string;
}

/** PRD §9.12: couple names, short message, wedding date, invitation link. Placeholder copy. */
export function renderGuestInvitationEmail(props: GuestInvitationEmailProps): RenderedEmail {
  const url = safeUrl(props.invitationUrl);
  const subject = `You're invited: ${props.coupleNames}'s wedding`;
  const text = [
    `Dear ${props.guestName},`,
    "",
    `${props.coupleNames} would love for you to celebrate their wedding with them on ${props.weddingDate}.`,
    "",
    "View your invitation and RSVP:",
    url,
  ].join("\n");
  const html = renderLayout({
    preheader: `${props.coupleNames} — ${props.weddingDate}`,
    bodyHtml: `<p>Dear ${escapeHtml(props.guestName)},</p>
      <p><strong>${escapeHtml(props.coupleNames)}</strong> would love for you to celebrate their wedding with them on ${escapeHtml(props.weddingDate)}.</p>
      ${renderButton(url, "View invitation & RSVP")}`,
  });
  return { subject, html, text };
}
