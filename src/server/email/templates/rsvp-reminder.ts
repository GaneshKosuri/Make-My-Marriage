import "server-only";

import type { RenderedEmail } from "../types";

import { escapeHtml, renderButton, renderLayout, safeUrl } from "./layout";

export interface RsvpReminderEmailProps {
  guestName: string;
  coupleNames: string;
  weddingDate: string;
  invitationUrl: string;
}

/** PRD §9.13. Placeholder copy. */
export function renderRsvpReminderEmail(props: RsvpReminderEmailProps): RenderedEmail {
  const url = safeUrl(props.invitationUrl);
  const subject = `Reminder: please RSVP for ${props.coupleNames}'s wedding`;
  const text = [
    `Dear ${props.guestName},`,
    "",
    `${props.coupleNames} are looking forward to celebrating with you on ${props.weddingDate}. Please let them know if you can attend:`,
    url,
  ].join("\n");
  const html = renderLayout({
    preheader: "Please RSVP",
    bodyHtml: `<p>Dear ${escapeHtml(props.guestName)},</p>
      <p><strong>${escapeHtml(props.coupleNames)}</strong> are looking forward to celebrating with you on ${escapeHtml(props.weddingDate)}. Please let them know if you can attend.</p>
      ${renderButton(url, "RSVP now")}`,
  });
  return { subject, html, text };
}
