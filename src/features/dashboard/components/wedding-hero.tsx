import { ArrowUpRight, CalendarDays, MapPin, Pencil } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import {
  coupleDisplayName,
  weddingCountdownLabel,
  weddingPlace,
  type CoupleWedding,
} from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";

import { DASHBOARD, DASHBOARD_ROUTES } from "../dashboard-content";
import { focusRing } from "./dashboard-card";

const DAYS_IN_A_YEAR = 365;

/** The burgundy header card: couple, date, place and the countdown (PRD §9.3). */
export function WeddingHero({
  wedding,
  daysRemaining,
}: Readonly<{ wedding: CoupleWedding; daysRemaining: number }>) {
  const place = weddingPlace(wedding);
  const label = weddingCountdownLabel(daysRemaining);

  return (
    <section
      aria-label="Your wedding"
      className="relative overflow-hidden rounded-3xl bg-burgundy p-5 text-ivory shadow-md md:p-10"
    >
      <div className="flex items-start justify-between gap-4 md:items-center">
        <div className="min-w-0">
          <p className="hidden text-eyebrow text-gold-light uppercase md:block">
            {DASHBOARD.hero.eyebrow}
          </p>
          <h1 className="font-serif text-headline-md break-words md:mt-3 md:text-display">
            {coupleDisplayName(wedding)}
          </h1>
          <p className="mt-2 flex flex-col gap-1 text-body-md text-ivory/85 md:flex-row md:items-center md:gap-3 md:text-body-lg">
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden className="size-4 text-gold-light" />
              {formatDateOnly(wedding.weddingDate)}
            </span>
            {place && (
              <>
                <span aria-hidden className="hidden md:inline">
                  ·
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin aria-hidden className="size-4 text-gold-light" />
                  {place}
                </span>
              </>
            )}
          </p>
        </div>
        <Countdown days={daysRemaining} label={label} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:mt-7 md:flex md:flex-wrap">
        <Link
          href={DASHBOARD_ROUTES.weddingDetails}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ivory/30 bg-ivory/10 px-5 text-label-md hover:bg-ivory/20",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory",
          )}
        >
          <Pencil aria-hidden className="size-4" />
          <span className="md:hidden">{DASHBOARD.hero.editDetailsShort}</span>
          <span className="hidden md:inline">{DASHBOARD.hero.editDetails}</span>
        </Link>
        <Link
          href={DASHBOARD_ROUTES.website}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ivory px-5 text-label-md text-burgundy hover:bg-white",
            focusRing,
            "focus-visible:outline-ivory",
          )}
        >
          <span className="md:hidden">{DASHBOARD.hero.viewWebsiteShort}</span>
          <span className="hidden md:inline">{DASHBOARD.hero.viewWebsite}</span>
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}

/** A gold ring that fills as the day comes closer (full in the last days and after). */
function Countdown({ days, label }: Readonly<{ days: number; label: string }>) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = days <= 0 ? 1 : Math.min(1, Math.max(0.06, 1 - days / DAYS_IN_A_YEAR));
  const counting = days > 1;

  return (
    <div className="flex shrink-0 items-center gap-4 md:rounded-3xl md:border md:border-ivory/15 md:bg-ivory/10 md:px-6 md:py-5">
      <div className="relative size-[76px] md:size-[84px]">
        <svg viewBox="0 0 64 64" aria-hidden className="size-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth="5"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="var(--gold-light)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
          />
        </svg>
        <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
          {counting ? (
            <>
              <span className="font-serif text-headline-sm leading-none">{days}</span>
              <span className="mt-0.5 text-[10px] font-bold tracking-wide uppercase md:hidden">
                {days === 1 ? "day" : "days"}
              </span>
            </>
          ) : (
            <span className="px-1 text-center text-label-sm font-bold">{label}</span>
          )}
        </span>
      </div>
      {counting && (
        <div className="hidden md:block">
          <p className="font-serif text-headline-sm">{label}</p>
          <p className="text-body-sm text-ivory/75">{DASHBOARD.hero.untilTheDay}</p>
        </div>
      )}
      {/* The ring is decorative; this is what screen readers hear (desktop shows it as text). */}
      <span className={cn("sr-only", counting && "md:hidden")}>{label}</span>
    </div>
  );
}
