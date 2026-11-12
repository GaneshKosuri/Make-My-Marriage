import "server-only";

import type { EmailTemplateProps } from "@/server/email";

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

let port: GuestEmailPort | undefined;

export function configureGuestEmails(implementation: GuestEmailPort): void {
  port = implementation;
}

export function getGuestEmailPort(): GuestEmailPort {
  if (!port) throw new Error("Guest emails are not configured: call registerServerDependencies()");
  return port;
}
