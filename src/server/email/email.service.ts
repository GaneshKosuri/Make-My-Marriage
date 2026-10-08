import "server-only";

import { AppError, isAppError } from "@/server/errors";
import { logger } from "@/server/logging/logger";

import { emailTemplates, type EmailTemplateName, type EmailTemplateProps } from "./templates";
import type { EmailAdapter, EmailDeliveryResult, RenderedEmail } from "./types";

export interface SendEmailInput<T extends EmailTemplateName> {
  to: string;
  template: T;
  props: EmailTemplateProps[T];
  /** Optional provider-level idempotency key (e.g. EmailJob.idempotencyKey). */
  idempotencyKey?: string;
}

/**
 * The only way the app sends email (SYSTEM_DESIGN §45). Business code never
 * imports the Resend SDK.
 */
export interface EmailService {
  readonly adapterName: string;
  send<T extends EmailTemplateName>(input: SendEmailInput<T>): Promise<EmailDeliveryResult>;
}

export function renderEmail<T extends EmailTemplateName>(
  template: T,
  props: EmailTemplateProps[T],
): RenderedEmail {
  const render = emailTemplates[template] as (props: EmailTemplateProps[T]) => RenderedEmail;
  return render(props);
}

export function createEmailService(adapter: EmailAdapter, from: string): EmailService {
  return {
    adapterName: adapter.name,
    async send({ to, template, props, idempotencyKey }) {
      const rendered = renderEmail(template, props);
      try {
        return await adapter.deliver({ from, to, ...rendered, idempotencyKey });
      } catch (error) {
        if (isAppError(error)) throw error;
        // Provider detail stays in the logs; the recipient/props never do.
        logger.error("Email delivery failed", { adapter: adapter.name, template, error });
        throw new AppError("EXTERNAL_SERVICE_ERROR", "Email delivery is temporarily unavailable.", {
          cause: error,
        });
      }
    },
  };
}
