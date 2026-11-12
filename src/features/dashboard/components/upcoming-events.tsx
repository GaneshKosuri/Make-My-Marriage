import { Plus } from "lucide-react";
import Link from "next/link";

import { EventRow } from "@/features/events/components/event-row";
import type { EventDto } from "@/modules/events/event.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { textLink } from "@/components/ui/button-styles";
import { ArrowLink, DashboardCard, EmptyState } from "@/components/ui/dashboard-card";

/** PRD §9.3 "Upcoming Events": the nearest ceremonies with time, venue and dress code. */
export function UpcomingEvents({
  events,
  timeZone,
}: Readonly<{ events: readonly EventDto[]; timeZone: string }>) {
  const copy = DASHBOARD.events;
  return (
    <DashboardCard
      title={copy.title}
      actions={
        events.length > 0 && (
          <Link href={DASHBOARD_ROUTES.addEvent} className={textLink}>
            <Plus aria-hidden className="size-4" />
            {copy.add}
          </Link>
        )
      }
    >
      {events.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          description={copy.empty.description}
          action={{ label: copy.empty.action, href: DASHBOARD_ROUTES.addEvent }}
        />
      ) : (
        <>
          <ul className="divide-y divide-sand border-t border-sand">
            {events.map((event) => (
              <li key={event.id}>
                <EventRow event={event} timeZone={timeZone} />
              </li>
            ))}
          </ul>
          <div className="border-t border-sand pt-4">
            <ArrowLink href={DASHBOARD_ROUTES.events}>{copy.all}</ArrowLink>
          </div>
        </>
      )}
    </DashboardCard>
  );
}
