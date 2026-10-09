import { CheckCheck, CircleCheck, Clock, Flag, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";

import { SAMPLE_WEDDING, WORKSPACE_PREVIEW } from "../home-content";

/**
 * Illustrations of the wedding workspace in the hero. They are pictures of the
 * product, so each is exposed to assistive technology as one image with a
 * summary label.
 */
const { stats, schedule, rsvp, tasks } = WORKSPACE_PREVIEW;
const PREVIEW_LABEL = `Example wedding workspace for ${SAMPLE_WEDDING.couple}: ${SAMPLE_WEDDING.daysToGo}, ${tasks.done} of ${tasks.total} tasks done, 186 guests and 132 RSVPs.`;

/** Desktop/tablet: the workspace card with an overlapping guest RSVP card. */
export function WorkspacePreview({ className }: Readonly<{ className?: string }>) {
  return (
    <div role="img" aria-label={PREVIEW_LABEL} className={cn("relative pb-16", className)}>
      <div className="pointer-events-none absolute -top-12 -right-12 size-96 rounded-full bg-sand/60 blur-3xl" />

      <div className="relative rounded-3xl border border-sand bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-sand pb-6">
          <div>
            <p className="text-eyebrow text-plum uppercase">{WORKSPACE_PREVIEW.label}</p>
            <p className="mt-1 font-serif text-headline-sm text-burgundy">
              {SAMPLE_WEDDING.couple}
            </p>
            <p className="mt-1 flex items-center gap-2 text-body-sm text-plum">
              <MapPin aria-hidden className="size-4 text-gold" />
              {SAMPLE_WEDDING.dateAndPlace}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-sand bg-sand px-3 py-1.5 text-label-md whitespace-nowrap text-burgundy shadow-sm">
            <span className="size-2 rounded-full bg-burgundy motion-safe:animate-pulse" />
            {WORKSPACE_PREVIEW.status}
          </span>
        </div>

        <div className="mb-6 rounded-2xl border border-sand bg-ivory p-5">
          <p className="text-eyebrow text-gold-deep uppercase">
            {WORKSPACE_PREVIEW.countdownLabel}
          </p>
          <p className="mt-1 font-serif text-[32px] leading-tight font-semibold text-burgundy">
            {SAMPLE_WEDDING.daysToGo}
          </p>
          <p className="mt-0.5 text-body-sm text-plum">{SAMPLE_WEDDING.nextEvent}</p>
        </div>

        <div className="mb-6 grid grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-sand bg-ivory p-3.5 shadow-sm"
            >
              <p className="text-metric text-burgundy">{stat.value}</p>
              <p className="mt-1 text-label-sm whitespace-nowrap text-plum uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mb-2 text-eyebrow text-plum uppercase">{WORKSPACE_PREVIEW.scheduleLabel}</p>
        {/* Rows stop short of the overlapping RSVP card, so nothing is hidden behind it. */}
        <ul className="mr-56 space-y-2.5">
          {schedule.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-3 rounded-xl border border-sand bg-ivory p-3 shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sand text-title-md text-burgundy">
                {item.initial}
              </span>
              <span className="min-w-0">
                <span className="block text-title-md leading-tight text-graphite">{item.name}</span>
                <span className="block truncate text-body-sm text-plum">{item.when}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute right-0 bottom-0 z-10 w-64 rounded-3xl border border-sand bg-white p-5 shadow-2xl xl:-right-4">
        <div className="mb-3 flex items-center justify-between border-b border-sand pb-3 text-label-sm">
          <span className="text-plum">{rsvp.label}</span>
          <span className="font-semibold text-burgundy">{rsvp.tag}</span>
        </div>
        <div className="mb-3 rounded-2xl border border-sand bg-ivory p-3.5">
          <p className="text-title-md text-graphite">{rsvp.guest}</p>
          <p className="mt-0.5 text-body-sm text-plum">{rsvp.invitedTo}</p>
          <p className="mt-3 flex items-center justify-between rounded-xl border border-sand bg-white px-3 py-2 shadow-sm">
            <span className="text-label-sm text-graphite">{rsvp.party}</span>
            <span className="text-label-md font-bold text-burgundy">{rsvp.response}</span>
          </p>
        </div>
        <p className="w-full rounded-xl bg-burgundy py-2.5 text-center text-[13px] font-semibold text-white shadow-sm">
          {rsvp.saved}
        </p>
      </div>
    </div>
  );
}

/** Phones: the stacked workspace card from the mobile design. */
export function WorkspacePreviewCompact({ className }: Readonly<{ className?: string }>) {
  const progress = Math.round((tasks.done / tasks.total) * 100);
  return (
    <div
      role="img"
      aria-label={PREVIEW_LABEL}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-sand bg-ivory p-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-bold tracking-wider text-gold-deep uppercase">
            {WORKSPACE_PREVIEW.label}
          </span>
          <span className="font-serif text-[18px] font-semibold text-burgundy">
            {SAMPLE_WEDDING.couple}
          </span>
          <span className="text-body-sm text-plum">{SAMPLE_WEDDING.dateAndPlace}</span>
        </div>
        <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-burgundy">
          {WORKSPACE_PREVIEW.status}
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-sand bg-sand/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-bold text-burgundy">{SAMPLE_WEDDING.daysToGo}</span>
          <span className="rounded-full border border-sand bg-white px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-plum">
            Tasks {tasks.done}/{tasks.total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
          <div className="h-1.5 rounded-full bg-burgundy" style={{ width: `${progress}%` }} />
        </div>
        <span className="flex items-center gap-1 text-body-sm text-plum">
          <Flag aria-hidden className="size-3.5 text-gold" />
          {SAMPLE_WEDDING.nextEvent}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col rounded-xl border border-sand bg-ivory p-2.5"
          >
            <span className="text-[10px] font-bold tracking-wider text-plum uppercase">
              {stat.label}
            </span>
            <span className="mt-0.5 text-[24px] leading-tight font-bold text-burgundy">
              {stat.value}
            </span>
            <span className="text-body-sm text-plum">{stat.detail}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <span className="text-[10px] font-bold tracking-wider text-plum uppercase">
          {WORKSPACE_PREVIEW.scheduleLabel}
        </span>
        {schedule.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between gap-2 rounded-lg border border-sand bg-ivory p-2 text-graphite"
          >
            <span className="flex items-center gap-2">
              {item.done ? (
                <CircleCheck aria-hidden className="size-[18px] text-gold" />
              ) : (
                <Clock aria-hidden className="size-[18px] text-burgundy" />
              )}
              <span className="text-[13px] font-semibold">{item.name}</span>
            </span>
            <span
              className={cn(
                "text-[11px] whitespace-nowrap text-plum",
                item.done && "rounded-full bg-sand px-2 py-0.5 font-medium",
              )}
            >
              {item.whenShort}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-sand bg-sand/40 p-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-burgundy text-[12px] font-bold text-ivory">
            {rsvp.initials}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-semibold text-burgundy">{rsvp.guest}</span>
            <span className="text-body-sm text-plum">{rsvp.summary}</span>
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-sand bg-sand px-2.5 py-1 text-[11px] font-semibold text-burgundy">
          <CheckCheck aria-hidden className="size-3.5" />
          Attending
        </span>
      </div>
    </div>
  );
}
