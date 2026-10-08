import "server-only";

import type { EmailAdapter, OutgoingEmail } from "../types";

export interface FakeEmailAdapter extends EmailAdapter {
  /** Everything "sent", in order. */
  readonly sent: OutgoingEmail[];
  /** Make the next delivery throw `error`. */
  failNext(error?: Error): void;
  clear(): void;
}

/** Test transport: records mail in memory. */
export function createFakeEmailAdapter(): FakeEmailAdapter {
  const sent: OutgoingEmail[] = [];
  let nextFailure: Error | undefined;
  return {
    name: "fake",
    sent,
    failNext(error = new Error("Simulated email failure")) {
      nextFailure = error;
    },
    clear() {
      sent.length = 0;
      nextFailure = undefined;
    },
    async deliver(message) {
      if (nextFailure) {
        const error = nextFailure;
        nextFailure = undefined;
        throw error;
      }
      sent.push(message);
      return { providerMessageId: `fake-${sent.length}` };
    },
  };
}
