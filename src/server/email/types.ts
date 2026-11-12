import "server-only";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface OutgoingEmail extends RenderedEmail {
  from: string;
  to: string;
  /** Provider-level idempotency (Resend `Idempotency-Key`), e.g. the EmailJob key. */
  idempotencyKey?: string;
}

/**
 * The provider refused because a sending limit was reached (Gmail's ~500 a
 * day, Resend's rate or daily quota). Nothing is wrong with the email itself:
 * try again later, without counting it as a failed attempt (decided 2026-11-12).
 */
export class EmailQuotaError extends Error {
  override readonly name = "EmailQuotaError";
}

/** True for a quota refusal, whether thrown directly or wrapped by EmailService. */
export function isEmailQuotaError(error: unknown): boolean {
  return (
    error instanceof EmailQuotaError ||
    (error instanceof Error && error.cause instanceof EmailQuotaError)
  );
}

export interface EmailDeliveryResult {
  providerMessageId: string | null;
}

/** A transport. Business code never sees adapters, only EmailService. */
export interface EmailAdapter {
  readonly name: string;
  deliver(message: OutgoingEmail): Promise<EmailDeliveryResult>;
}
