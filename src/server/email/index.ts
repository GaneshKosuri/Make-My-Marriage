import "server-only";

import { getEnv, type Env } from "@/server/config/env";
import { logger } from "@/server/logging/logger";

import { createConsoleEmailAdapter } from "./adapters/console.adapter";
import { createFakeEmailAdapter } from "./adapters/fake.adapter";
import { createGmailAdapter } from "./adapters/gmail.adapter";
import { createResendAdapter } from "./adapters/resend.adapter";
import { createEmailService, type EmailService } from "./email.service";
import type { EmailAdapter } from "./types";

export { createFakeEmailAdapter, type FakeEmailAdapter } from "./adapters/fake.adapter";
export {
  createEmailService,
  renderEmail,
  type EmailService,
  type SendEmailInput,
} from "./email.service";
export type {
  EmailTemplateName,
  EmailTemplateProps,
  GuestInvitationEmailProps,
  MemberInvitationEmailProps,
  PasswordResetEmailProps,
  RsvpReminderEmailProps,
} from "./templates";
export type { EmailDeliveryResult, RenderedEmail } from "./types";

const FALLBACK_FROM = "Make My Marriage <noreply@localhost>";
const DEFAULT_SENDER_NAME = "Make My Marriage";

let emailService: EmailService | undefined;

/**
 * Gmail always sends from the signed-in address, so the From line uses it,
 * keeping only the display name from EMAIL_FROM ("Make My Marriage").
 */
export function gmailFrom(emailFrom: string | undefined, gmailUser: string): string {
  const name = emailFrom?.match(/^\s*"?([^"<]*?)"?\s*</)?.[1]?.trim() || DEFAULT_SENDER_NAME;
  return `${name} <${gmailUser}>`;
}

/**
 * Adapter selection: test → fake; GMAIL_USER + GMAIL_APP_PASSWORD → Gmail;
 * RESEND_API_KEY → Resend; otherwise (dev only — production requires a key)
 * → console. Gmail comes first so it can be tried without removing a Resend key.
 */
export function selectEmailTransport(env: Env): { adapter: EmailAdapter; from: string } {
  if (env.NODE_ENV === "test") {
    return { adapter: createFakeEmailAdapter(), from: env.EMAIL_FROM ?? FALLBACK_FROM };
  }
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return {
      adapter: createGmailAdapter({ user: env.GMAIL_USER, appPassword: env.GMAIL_APP_PASSWORD }),
      from: gmailFrom(env.EMAIL_FROM, env.GMAIL_USER),
    };
  }
  const adapter = env.RESEND_API_KEY
    ? createResendAdapter(env.RESEND_API_KEY)
    : createConsoleEmailAdapter();
  return { adapter, from: env.EMAIL_FROM ?? FALLBACK_FROM };
}

export function getEmailService(): EmailService {
  if (emailService) return emailService;
  const { adapter, from } = selectEmailTransport(getEnv());
  // Which transport is live, so a missing email is easy to trace (no secrets).
  logger.info("Email transport selected", { adapter: adapter.name });
  emailService = createEmailService(adapter, from);
  return emailService;
}

/** Tests only. Pass `undefined` to fall back to adapter selection. */
export function setEmailServiceForTests(service: EmailService | undefined): void {
  emailService = service;
}
