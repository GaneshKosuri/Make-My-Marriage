import type { Metadata } from "next";
import { Suspense } from "react";

import { EventsScreen } from "@/features/events/components/events-screen";
import { NEW_EVENT_PARAM } from "@/features/events/events-content";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Events" };

/** /app/events (PRD §9.5): the wedding's events; `?new=1` opens the add form. */
export default function EventsPage({ searchParams }: PageProps<"/app/events">) {
  return (
    <Suspense fallback={null}>
      <Events searchParams={searchParams} />
    </Suspense>
  );
}

async function Events({ searchParams }: Pick<PageProps<"/app/events">, "searchParams">) {
  // Memoised per request: the layout's guard made the same call.
  const [current, query] = await Promise.all([getCurrentContext(), searchParams]);
  if (!current?.wedding) return null;
  const { wedding } = current;
  const now = new Date();
  return (
    <EventsScreen
      timeZone={wedding.timeZone}
      weddingDate={wedding.weddingDate}
      today={dateOnlyInTimeZone(now, wedding.timeZone)}
      now={now.toISOString()}
      startAdding={query[NEW_EVENT_PARAM] === "1"}
    />
  );
}
