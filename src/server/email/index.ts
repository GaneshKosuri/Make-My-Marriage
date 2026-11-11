import "server-only";

import { getEnv, resolveEmailProvider, type Env } from "@/server/config/env";
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
 * Adapter selection: tests always use the fake adapter; otherwise
 * `EMAIL_PROVIDER` (gmail | resend | console) picks the sender, and when it is
 * unset the first configured of Gmail, Resend, console is used. The env schema
 * has already checked that the chosen sender's settings are present.
 */
export function selectEmailTransport(env: Env): { adapter: EmailAdapter; from: string } {
  if (env.NODE_ENV === "test") {
    return { adapter: createFakeEmailAdapter(), from: env.EMAIL_FROM ?? FALLBACK_FROM };
  }
  switch (resolveEmailProvider(env)) {
    case "gmail":
      return {
        adapter: createGmailAdapter({
          user: env.GMAIL_USER!,
          appPassword: env.GMAIL_APP_PASSWORD!,
        }),
        from: gmailFrom(env.EMAIL_FROM, env.GMAIL_USER!),
      };
    case "resend":
      return {
        adapter: createResendAdapter(env.RESEND_API_KEY!),
        from: env.EMAIL_FROM ?? FALLBACK_FROM,
      };
    case "console":
      return { adapter: createConsoleEmailAdapter(), from: env.EMAIL_FROM ?? FALLBACK_FROM };
  }
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
