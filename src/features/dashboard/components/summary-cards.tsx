import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import type { DashboardDto } from "@/modules/dashboard/dashboard.types";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { focusRing } from "./dashboard-card";

/** The six numbers from PRD §9.3. Each card links to the page behind it. */
export function SummaryCards({ summary }: Readonly<{ summary: DashboardDto["summary"] }>) {
  const { cards, nothingYet } = DASHBOARD;
  const replied = summary.rsvps.attending + summary.rsvps.notAttending;
  const tasksPercent =
    summary.tasks.total > 0 ? Math.round((summary.tasks.completed / summary.tasks.total) * 100) : 0;

  return (
    <section aria-label={DASHBOARD.summaryHeading}>
      <h2 className="sr-only">{DASHBOARD.summaryHeading}</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 min-[85rem]:grid-cols-6">
        <SummaryCard
          label={cards.events.label}
          value={summary.events}
          detail={summary.events > 0 ? cards.events.unit : nothingYet}
          link={{ label: cards.events.link, href: DASHBOARD_ROUTES.events }}
        />
        <SummaryCard
          label={cards.tasks.label}
          value={
            summary.tasks.total > 0 ? (
              <>
                {summary.tasks.completed}
                <span className="font-sans text-body-md text-plum"> / {summary.tasks.total}</span>
              </>
            ) : (
              0
            )
          }
          detail={summary.tasks.total > 0 ? cards.tasks.unit : nothingYet}
          link={{ label: cards.tasks.link, href: DASHBOARD_ROUTES.tasks }}
        >
          {summary.tasks.total > 0 && (
            <div
              role="progressbar"
              aria-label={`${summary.tasks.completed} of ${summary.tasks.total} tasks completed`}
              aria-valuenow={tasksPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand"
            >
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${tasksPercent}%` }}
              />
            </div>
          )}
        </SummaryCard>
        <SummaryCard
          label={cards.guests.label}
          value={summary.guests}
          detail={summary.guests > 0 ? cards.guests.unit : nothingYet}
          link={{ label: cards.guests.link, href: DASHBOARD_ROUTES.guests }}
        />
        <SummaryCard
          label={cards.rsvps.label}
          value={replied}
          detail={
            summary.guests === 0 ? (
              nothingYet
            ) : summary.rsvps.pending > 0 ? (
              <span className="text-gold-deep">
                {cards.rsvps.stillToReply(summary.rsvps.pending)}
              </span>
            ) : (
              cards.rsvps.allReplied
            )
          }
          link={{ label: cards.rsvps.link, href: DASHBOARD_ROUTES.rsvp }}
        />
        <SummaryCard
          label={cards.expenses.label}
          value={formatINR(summary.totalExpensePaise)}
          detail={summary.totalExpensePaise > 0 ? cards.expenses.unit : nothingYet}
          link={{ label: cards.expenses.link, href: DASHBOARD_ROUTES.expenses }}
        />
        <SummaryCard
          label={cards.vendors.label}
          value={summary.vendors}
          detail={summary.vendors > 0 ? cards.vendors.unit : nothingYet}
          link={{ label: cards.vendors.link, href: DASHBOARD_ROUTES.vendors }}
        />
      </ul>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  link,
  children,
}: Readonly<{
  label: string;
  value: ReactNode;
  detail: ReactNode;
  link: { label: string; href: string };
  children?: ReactNode;
}>) {
  return (
    <li className="flex flex-col rounded-3xl border border-sand bg-white p-4 shadow-sm md:p-5">
      <h3 className="text-eyebrow text-plum uppercase">{label}</h3>
      <p className="mt-3 font-serif text-headline-sm text-graphite tabular-nums md:text-headline-md">
        {value}
      </p>
      {children}
      <p className="mt-1 text-body-sm text-plum">{detail}</p>
      <Link
        href={link.href}
        className={cn(
          "mt-auto inline-flex items-center gap-1 self-start rounded pt-4 text-label-md text-burgundy underline-offset-4 hover:underline",
          focusRing,
        )}
      >
        {link.label}
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </li>
  );
}
