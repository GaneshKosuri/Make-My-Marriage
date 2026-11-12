import { ok, policies, route } from "@/server/http";
import { guestsService } from "@/modules/guests";
import { sendRemindersSchema } from "@/modules/guests/guest.schemas";

/** /api/guests/actions/send-reminders (POST API §49). */

/** POST — API §49: queues RSVP reminders and answers at once with the batch to follow. */
export const POST = route({
  auth: "member",
  body: sendRemindersSchema,
  rateLimit: policies.guestEmailBulk,
  handler: async ({ ctx, body }) => ok(await guestsService.sendBulkReminders(ctx, body)),
});
