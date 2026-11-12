import "server-only";

import { Resend } from "resend";

import { EmailQuotaError, type EmailAdapter } from "../types";

export class ResendDeliveryError extends Error {
  override readonly name = "ResendDeliveryError";
}

/** Production transport. The SDK is imported here and nowhere else. */
export function createResendAdapter(apiKey: string): EmailAdapter {
  const client = new Resend(apiKey);
  return {
    name: "resend",
    async deliver({ from, to, subject, html, text, idempotencyKey }) {
      const { data, error } = await client.emails.send(
        { from, to, subject, html, text },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      if (error) {
        const description = `${error.name}: ${error.message}`;
        // Too many requests, or the plan's daily or monthly quota used up.
        if (/rate_limit|quota/i.test(error.name)) throw new EmailQuotaError(description);
        throw new ResendDeliveryError(description);
      }
      return { providerMessageId: data?.id ?? null };
    },
  };
}
