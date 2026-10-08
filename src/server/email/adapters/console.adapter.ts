import "server-only";

import { randomUUID } from "node:crypto";

import type { EmailAdapter } from "../types";

/**
 * Development default when RESEND_API_KEY is not set: prints the rendered email
 * (including its links, so reset/invite flows can be followed locally).
 * Refuses to run in production, where it would silently drop real email.
 */
export function createConsoleEmailAdapter(): EmailAdapter {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The console email adapter must never be used in production.");
  }
  return {
    name: "console",
    async deliver({ from, to, subject, text }) {
      console.info(
        [
          "",
          "──────── email (console adapter: not sent) ────────",
          `From:    ${from}`,
          `To:      ${to}`,
          `Subject: ${subject}`,
          "",
          text,
          "────────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
      return { providerMessageId: `console-${randomUUID()}` };
    },
  };
}
