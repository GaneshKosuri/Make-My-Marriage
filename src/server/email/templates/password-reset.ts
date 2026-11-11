import "server-only";

import type { RenderedEmail } from "../types";

import {
  escapeHtml,
  renderButton,
  renderLayout,
  renderNote,
  renderParagraph,
  safeUrl,
} from "./layout";

export interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

/** SYSTEM_DESIGN §12. */
export function renderPasswordResetEmail(props: PasswordResetEmailProps): RenderedEmail {
  const url = safeUrl(props.resetUrl);
  const subject = "Reset your Make My Marriage password";
  const text = [
    `Hi ${props.recipientName},`,
    "",
    "We received a request to reset your password. Use this link to choose a new one:",
    url,
    "",
    `The link expires in ${props.expiresInMinutes} minutes and can be used once.`,
    "If you didn't ask for this, you can ignore this email.",
  ].join("\n");
  const html = renderLayout({
    preheader: "Choose a new password for Make My Marriage",
    eyebrow: "Your account",
    title: "Reset your password",
    bodyHtml: `${renderParagraph(`Hi ${escapeHtml(props.recipientName)},`)}
      ${renderParagraph("We received a request to reset your password. Choose a new one with the button below.")}
      ${renderButton(url, "Choose a new password")}
      ${renderNote(`The link expires in ${props.expiresInMinutes} minutes and can be used once.`)}
      ${renderNote("If you didn't ask for this, you can ignore this email. Your password stays the same.")}`,
    footnote: "You received this because a password reset was requested for your account.",
  });
  return { subject, html, text };
}
