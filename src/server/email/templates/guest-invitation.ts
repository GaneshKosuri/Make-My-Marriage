import "server-only";

import type { RenderedEmail } from "../types";

import {
  escapeHtml,
  renderButton,
  renderDetails,
  renderLayout,
  renderParagraph,
  safeUrl,
} from "./layout";

export interface GuestInvitationEmailProps {
  guestName: string;
  coupleNames: string;
  /** Already formatted, e.g. "14 February 2027" */
  weddingDate: string;
  invitationUrl: string;
}

/** PRD §9.12: couple names, short message, wedding date, invitation link. Phase 3 refines the copy. */
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
    eyebrow: "You're invited",
    title: `${props.coupleNames} are getting married`,
    bodyHtml: `${renderParagraph(`Dear ${escapeHtml(props.guestName)},`)}
      ${renderParagraph(`<strong>${escapeHtml(props.coupleNames)}</strong> would love for you to celebrate their wedding with them on ${escapeHtml(props.weddingDate)}.`)}
      ${renderDetails([
        ["Couple", props.coupleNames],
        ["Date", props.weddingDate],
      ])}
      ${renderButton(url, "View invitation & RSVP")}`,
    footnote: "This invitation link is personal to you. Please don't forward it.",
  });
  return { subject, html, text };
}
