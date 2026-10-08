import "server-only";

import { getEnv } from "@/server/config/env";

import { createConsoleEmailAdapter } from "./adapters/console.adapter";
import { createFakeEmailAdapter } from "./adapters/fake.adapter";
import { createResendAdapter } from "./adapters/resend.adapter";
import { createEmailService, type EmailService } from "./email.service";

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

let emailService: EmailService | undefined;

/**
 * Adapter selection: test → fake; RESEND_API_KEY → Resend; otherwise (dev
 * only — production requires the key) → console.
 */
export function getEmailService(): EmailService {
  if (emailService) return emailService;
  const env = getEnv();
  const adapter =
    env.NODE_ENV === "test"
      ? createFakeEmailAdapter()
      : env.RESEND_API_KEY
        ? createResendAdapter(env.RESEND_API_KEY)
        : createConsoleEmailAdapter();
  emailService = createEmailService(adapter, env.EMAIL_FROM ?? FALLBACK_FROM);
  return emailService;
}

/** Tests only. Pass `undefined` to fall back to adapter selection. */
export function setEmailServiceForTests(service: EmailService | undefined): void {
  emailService = service;
}
