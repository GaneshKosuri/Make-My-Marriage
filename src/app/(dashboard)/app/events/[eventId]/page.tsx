import type { Metadata } from "next";
import { Suspense } from "react";

import { EventDetailScreen } from "@/features/events/components/event-detail-screen";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Event" };

/** /app/events/[eventId] (PRD §9.5): one event, with edit and archive. */
export default function EventDetailPage({ params }: PageProps<"/app/events/[eventId]">) {
  return (
    <Suspense fallback={null}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: Pick<PageProps<"/app/events/[eventId]">, "params">) {
  // Memoised per request: the layout's guard made the same call.
  const [current, { eventId }] = await Promise.all([getCurrentContext(), params]);
  if (!current?.wedding) return null;
  const { wedding } = current;
  return (
    <EventDetailScreen
      eventId={eventId}
      timeZone={wedding.timeZone}
      weddingDate={wedding.weddingDate}
      today={dateOnlyInTimeZone(new Date(), wedding.timeZone)}
    />
  );
}
