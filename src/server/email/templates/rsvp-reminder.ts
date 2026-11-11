import "server-only";

import type { RenderedEmail } from "../types";

import { escapeHtml, renderButton, renderLayout, renderParagraph, safeUrl } from "./layout";

export interface RsvpReminderEmailProps {
  guestName: string;
  coupleNames: string;
  weddingDate: string;
  invitationUrl: string;
}

/** PRD §9.13. Phase 3 refines the copy. */
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
    preheader: `Please RSVP for ${props.coupleNames}'s wedding`,
    eyebrow: "Reminder",
    title: "Will you be there?",
    bodyHtml: `${renderParagraph(`Dear ${escapeHtml(props.guestName)},`)}
      ${renderParagraph(`<strong>${escapeHtml(props.coupleNames)}</strong> are looking forward to celebrating with you on ${escapeHtml(props.weddingDate)}. Please let them know if you can attend.`)}
      ${renderButton(url, "RSVP now")}`,
    footnote: "This invitation link is personal to you. Please don't forward it.",
  });
  return { subject, html, text };
}
