import "server-only";

import { Resend } from "resend";

import type { EmailAdapter } from "../types";

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
      if (error) throw new ResendDeliveryError(`${error.name}: ${error.message}`);
      return { providerMessageId: data?.id ?? null };
    },
  };
}
