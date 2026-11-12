import "server-only";

import { getEmailService, type EmailTemplateProps } from "@/server/email";

import type { EmailJobRecord } from "./email-job.model";

/** What a queued guest email turns into when it is sent. */
export type QueuedGuestEmail =
  | { to: string; template: "guest-invitation"; props: EmailTemplateProps["guest-invitation"] }
  | { to: string; template: "rsvp-reminder"; props: EmailTemplateProps["rsvp-reminder"] };

/**
 * The guests module fills this in (src/composition-root.ts): the worker needs
 * a guest's details to build each email, and the guests module already uses
 * this module to queue and cancel them, so it can't be imported back here.
 */
export interface GuestEmailPort {
  /**
   * The email for this job as things stand now, or null when it no longer
   * applies: the guest was deleted or has no email address, or (for a
   * reminder) has already replied.
   */
  compose(
    job: Pick<EmailJobRecord, "weddingId" | "guestId" | "type">,
  ): Promise<QueuedGuestEmail | null>;
  /** Records the delivery on the guest (invitation sent, or reminder count). */
  delivered(job: Pick<EmailJobRecord, "weddingId" | "guestId" | "type">, at: Date): Promise<void>;
}

/**
 * Sends a guest email through the app's email service: now (a single send),
 * or from the queue with the job's idempotency key.
 */
export function sendGuestEmail(email: QueuedGuestEmail, idempotencyKey?: string) {
  const service = getEmailService();
  // One call per template keeps each template's props type-checked.
  return email.template === "guest-invitation"
    ? service.send({ to: email.to, template: email.template, props: email.props, idempotencyKey })
    : service.send({ to: email.to, template: email.template, props: email.props, idempotencyKey });
}

/**
 * On globalThis, like the identity ports: src/instrumentation.ts registers it
 * in its own server bundle, and the route handlers (another bundle, with its
 * own copy of this module) must see the same port (QA P1-1).
 */
const registry = globalThis as typeof globalThis & { __mmmGuestEmailPort?: GuestEmailPort };

export function configureGuestEmails(implementation: GuestEmailPort): void {
  registry.__mmmGuestEmailPort = implementation;
}

export function getGuestEmailPort(): GuestEmailPort {
  const port = registry.__mmmGuestEmailPort;
  if (!port) {
    throw new Error(
      "Guest emails are not configured. registerServerDependencies() from src/composition-root.ts " +
        "must run at startup (src/instrumentation.ts in Next.js, tests/setup/* in Vitest).",
    );
  }
  return port;
}
