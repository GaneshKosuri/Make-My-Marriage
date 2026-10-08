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

export interface EmailDeliveryResult {
  providerMessageId: string | null;
}

/** A transport. Business code never sees adapters, only EmailService. */
export interface EmailAdapter {
  readonly name: string;
  deliver(message: OutgoingEmail): Promise<EmailDeliveryResult>;
}
