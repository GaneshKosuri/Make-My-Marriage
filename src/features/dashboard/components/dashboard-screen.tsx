"use client";

import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/cn";
import { coupleDisplayName, type CoupleWedding } from "@/lib/couple";
import type { DateOnly } from "@/lib/dates";
import type { MemberRole } from "@/modules/members/member.constants";

import { useDashboard } from "../api";
import { DASHBOARD } from "../dashboard-content";
import { focusRing } from "./dashboard-card";
import { GetStarted, gettingStartedSteps } from "./get-started";
import { RsvpOverview } from "./rsvp-overview";
import { SummaryCards } from "./summary-cards";
import { UpcomingEvents } from "./upcoming-events";
import { UpcomingTasks } from "./upcoming-tasks";
import { WeddingHero } from "./wedding-hero";

export interface DashboardScreenProps {
  wedding: CoupleWedding;
  role: MemberRole;
  /** From the server, so the countdown and "overdue" match the first render. */
  daysRemaining: number;
  today: DateOnly;
}

/**
 * /app — the wedding dashboard (PRD §9.3): countdown, six summary numbers,
 * upcoming events and tasks, RSVP overview and the "Get started" checklist.
 * Informational only; every number links to the page that changes it.
 */
export function DashboardScreen({
  wedding,
  role,
  daysRemaining,
  today,
}: Readonly<DashboardScreenProps>) {
  const dashboard = useDashboard();
  const data = dashboard.data;
  const days = data?.countdown.daysRemaining ?? daysRemaining;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 md:gap-6">
      <WeddingHero wedding={wedding} daysRemaining={days} />

      {data ? (
        <DashboardBody data={data} wedding={wedding} role={role} today={today} />
      ) : dashboard.isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-3xl border border-destructive/20 bg-white p-5 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="text-label-md text-destructive">{DASHBOARD.error.title}</p>
            <p className="text-body-md text-plum">{DASHBOARD.error.description}</p>
          </div>
          <button
            type="button"
            onClick={() => void dashboard.refetch()}
            disabled={dashboard.isFetching}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border border-sand bg-white px-4 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
              focusRing,
            )}
          >
            <RefreshCw
              aria-hidden
              className={cn("size-4", dashboard.isFetching && "animate-spin")}
            />
            {DASHBOARD.error.retry}
          </button>
        </div>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}

function DashboardBody({
  data,
  wedding,
  role,
  today,
}: Readonly<{
  data: NonNullable<ReturnType<typeof useDashboard>["data"]>;
  wedding: CoupleWedding;
  role: MemberRole;
  today: DateOnly;
}>) {
  const steps = gettingStartedSteps(data.summary, role);
  const done = steps.filter((step) => step.done).length;
  // A brand-new wedding leads with the welcome and the checklist (Stitch M4).
  const isNew = done === 0 || (done === 1 && steps.find((step) => step.key === "member")?.done);
  const checklist = done < steps.length && <GetStarted steps={steps} />;

  return (
    <>
      {isNew && (
        <>
          <section
            aria-label="Welcome"
            className="rounded-3xl border border-sand bg-white p-5 shadow-sm md:p-7"
          >
            <h2 className="font-serif text-headline-sm text-graphite md:text-headline-md">
              {DASHBOARD.welcome.title(coupleDisplayName(wedding))}
            </h2>
            <p className="mt-1 text-body-lg text-plum">{DASHBOARD.welcome.description}</p>
          </section>
          {checklist}
        </>
      )}

      <SummaryCards summary={data.summary} />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <UpcomingEvents events={data.upcomingEvents} timeZone={wedding.timeZone} />
        <UpcomingTasks tasks={data.upcomingTasks} timeZone={wedding.timeZone} today={today} />
      </div>

      <RsvpOverview guests={data.summary.guests} rsvps={data.summary.rsvps} />

      {!isNew && checklist}
    </>
  );
}

/** Placeholder blocks while the numbers load (Stitch M4 "Loading"). */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label={DASHBOARD.loading} className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 min-[85rem]:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[150px] animate-pulse rounded-3xl border border-sand bg-white p-5"
          >
            <div className="h-3 w-16 rounded bg-sand" />
            <div className="mt-4 h-7 w-12 rounded bg-sand" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl border border-sand bg-white p-7"
          >
            <div className="h-5 w-40 rounded bg-sand" />
            <div className="mt-6 h-14 rounded-xl bg-sand/60" />
            <div className="mt-3 h-14 rounded-xl bg-sand/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
