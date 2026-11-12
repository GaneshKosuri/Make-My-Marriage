import "server-only";

import nodemailer from "nodemailer";

import { EmailQuotaError, type EmailAdapter } from "../types";

export class GmailDeliveryError extends Error {
  override readonly name = "GmailDeliveryError";
}

/** SMTP failures carry a code and the server's reply; never the credentials. */
interface SmtpError {
  code?: string;
  responseCode?: number;
  response?: string;
}

/**
 * Gmail's sending limits: "550 5.4.5 Daily user sending limit exceeded", and
 * 421/452/454 replies asking the client to slow down or come back later.
 */
export function isGmailQuotaRefusal(error: unknown): boolean {
  const { responseCode, response } = (error ?? {}) as SmtpError;
  if (response && /5\.4\.5|sending (limit|quota)|rate limit/i.test(response)) return true;
  return responseCode === 421 || responseCode === 452 || responseCode === 454;
}

function describe(error: unknown): string {
  const { code, responseCode, response } = (error ?? {}) as SmtpError;
  if (code === "EAUTH") {
    return "Gmail refused the sign-in: check GMAIL_USER and GMAIL_APP_PASSWORD (2-Step Verification must be on).";
  }
  const reply = response?.split("\n")[0]?.slice(0, 200);
  return [code, responseCode, reply].filter(Boolean).join(" ") || "Unknown Gmail error";
}

/**
 * Sends through Gmail's own SMTP servers with a Google app password, so a
 * personal Gmail address can send without a domain of its own (decided
 * 2026-11-11). Gmail caps personal accounts at about 500 recipients a day and
 * sends from the Gmail address whatever `from` says. SMTP has no idempotency
 * key, so `idempotencyKey` is ignored. nodemailer is imported here and nowhere else.
 */
export function createGmailAdapter({
  user,
  appPassword,
}: {
  user: string;
  appPassword: string;
}): EmailAdapter {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });
  return {
    name: "gmail",
    async deliver({ from, to, subject, html, text }) {
      try {
        const info = await transport.sendMail({ from, to, subject, html, text });
        return { providerMessageId: info.messageId ?? null };
      } catch (error) {
        if (isGmailQuotaRefusal(error)) throw new EmailQuotaError(describe(error));
        throw new GmailDeliveryError(describe(error));
      }
    },
  };
}
