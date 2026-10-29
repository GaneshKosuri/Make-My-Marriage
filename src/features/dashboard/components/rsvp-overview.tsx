import { cn } from "@/lib/cn";
import type { DashboardDto } from "@/modules/dashboard/dashboard.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { ArrowLink, DashboardCard, EmptyState } from "./dashboard-card";

/**
 * Replies by guest entry (one entry can be a whole family) and the number of
 * people coming (API_DESIGN §52: invitations and attendees are different counts).
 */
export function RsvpOverview({
  guests,
  rsvps,
}: Readonly<{ guests: number; rsvps: DashboardDto["summary"]["rsvps"] }>) {
  const copy = DASHBOARD.rsvp;
  const segments = [
    { key: "attending", label: copy.attending, count: rsvps.attending, color: "bg-success" },
    { key: "pending", label: copy.pending, count: rsvps.pending, color: "bg-pending" },
    {
      key: "notAttending",
      label: copy.notAttending,
      count: rsvps.notAttending,
      color: "bg-destructive",
    },
  ] as const;
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <DashboardCard
      title={copy.title}
      description={copy.description}
      actions={guests > 0 && <ArrowLink href={DASHBOARD_ROUTES.rsvp}>{copy.link}</ArrowLink>}
    >
      {guests === 0 ? (
        <EmptyState
          title={copy.empty.title}
          description={copy.empty.description}
          action={{ label: copy.empty.action, href: DASHBOARD_ROUTES.guests }}
        />
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl border border-sand bg-ivory p-5 md:flex-row md:items-center md:gap-8 md:p-6">
          <div className="min-w-0 flex-1">
            <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-sand">
              {segments.map((segment) =>
                segment.count > 0 ? (
                  <div
                    key={segment.key}
                    className={segment.color}
                    style={{ width: `${(segment.count / total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-body-md">
              {segments.map((segment) => (
                <li key={segment.key} className="inline-flex items-center gap-2">
                  <span aria-hidden className={cn("size-2.5 rounded-full", segment.color)} />
                  <span className="font-semibold text-graphite">{segment.label}:</span>
                  <span className="text-plum tabular-nums">{segment.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-sand md:border-l md:pl-8">
            <p className="font-serif text-headline-md text-graphite">
              {copy.peopleAttending(rsvps.peopleAttending)}
            </p>
            <p className="text-body-sm text-plum">{copy.headcount}</p>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
