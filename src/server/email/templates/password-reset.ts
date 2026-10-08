import "server-only";

import type { RenderedEmail } from "../types";

import { escapeHtml, renderButton, renderLayout, safeUrl } from "./layout";

export interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

/** SYSTEM_DESIGN §12. Placeholder copy. */
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
    preheader: "Reset your password",
    bodyHtml: `<p>Hi ${escapeHtml(props.recipientName)},</p>
      <p>We received a request to reset your password.</p>
      ${renderButton(url, "Choose a new password")}
      <p>The link expires in ${props.expiresInMinutes} minutes and can be used once. If you didn't ask for this, you can ignore this email.</p>`,
  });
  return { subject, html, text };
}
