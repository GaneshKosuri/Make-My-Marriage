import { CalendarDays, Camera, Clock, MapPin } from "lucide-react";

import { YouTubePlayer } from "@/components/ui/youtube-player";
import { cn } from "@/lib/cn";

import {
  countdown,
  CoverImage,
  daysLeft,
  eventDate,
  eventPlace,
  eventTimes,
  siteTitle,
  THEME_COPY,
  weddingDay,
} from "../shared";
import type { ThemeProps } from "../types";

/** Event cards cycle through bold brand blocks (Stitch "Website Modern"). */
const EVENT_CARD_STYLES = [
  {
    card: "bg-burgundy text-ivory",
    chip: "bg-gold-light text-burgundy-deep",
    link: "text-gold-light",
  },
  { card: "bg-gold-deep text-ivory", chip: "bg-ivory text-gold-deep", link: "text-ivory" },
  { card: "bg-sand text-graphite", chip: "bg-burgundy text-ivory", link: "text-burgundy" },
] as const;

/**
 * "Modern Celebration" (PRD §9.19): bright and contemporary. Big burgundy and
 * gold blocks, a tilted photo card, an oversized countdown and colourful event
 * cards, all in the brand palette. Layout follows the Stitch "Website Modern"
 * screens.
 */
export function ModernTheme({ wedding }: Readonly<ThemeProps>) {
  const title = siteTitle(wedding);
  const number = daysLeft(wedding);
  const label = countdown(wedding);
  return (
    <div className="min-h-dvh bg-ivory font-sans text-graphite">
      <header className="rounded-b-[48px] bg-linear-to-br from-burgundy to-burgundy-deep px-5 pt-12 pb-14 text-ivory md:pt-20 md:pb-20">
        <div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-2">
          <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-gold-light px-4 py-1.5 text-label-md text-burgundy-deep">
              <CalendarDays aria-hidden className="size-4" />
              {weddingDay(wedding)}
              {wedding.place && ` · ${wedding.place}`}
            </p>
            <h1 className="font-serif text-[2.75rem] leading-[1.05] wrap-break-word md:text-[4.25rem]">
              {title}
            </h1>
            {number !== null ? (
              <p className="flex items-baseline gap-3">
                <span className="font-serif text-[4.5rem] leading-none text-gold-light md:text-[5.5rem]">
                  {number}
                </span>
                <span className="text-title-md tracking-widest uppercase">
                  {THEME_COPY.daysToGo(number)}
                </span>
              </p>
            ) : (
              label && <p className="text-title-lg text-gold-light">{label}</p>
            )}
          </div>
          {wedding.coverImageUrl && (
            <div className="mx-auto w-full max-w-md rotate-2 rounded-[32px] bg-ivory/15 p-3 shadow-2xl">
              <CoverImage
                wedding={wedding}
                className="aspect-[4/3] w-full -rotate-2 rounded-[24px] object-cover"
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-12 px-4 py-12 md:gap-16 md:py-16">
        {(wedding.welcomeMessage || wedding.description) && (
          <section
            aria-labelledby="modern-welcome"
            className="rounded-[32px] bg-sand/70 p-7 md:p-10"
          >
            <h2 id="modern-welcome" className="font-serif text-headline-md text-burgundy">
              {THEME_COPY.welcome}
            </h2>
            {wedding.welcomeMessage && (
              <p className="mt-4 max-w-3xl text-body-lg whitespace-pre-line">
                {wedding.welcomeMessage}
              </p>
            )}
            {wedding.description && (
              <p className="mt-3 max-w-3xl text-body-md whitespace-pre-line text-plum">
                {wedding.description}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="modern-events" className="flex flex-col gap-6">
          <h2 id="modern-events" className="font-serif text-headline-md text-burgundy">
            {THEME_COPY.events}
          </h2>
          {wedding.events.length === 0 ? (
            <p className="text-body-lg text-plum">{THEME_COPY.noEvents}</p>
          ) : (
            <ol className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {wedding.events.map((event, index) => {
                const style = EVENT_CARD_STYLES[index % EVENT_CARD_STYLES.length]!;
                const place = eventPlace(event);
                return (
                  <li
                    key={`${event.name}-${event.startsAt}`}
                    className={cn(
                      "flex w-[82%] shrink-0 snap-start flex-col gap-3 rounded-[28px] p-6 md:w-auto",
                      style.card,
                    )}
                  >
                    <p
                      className={cn("self-start rounded-full px-3 py-1 text-label-sm", style.chip)}
                    >
                      {eventDate(event, wedding.timeZone)}
                    </p>
                    <h3 className="font-serif text-headline-sm wrap-break-word">{event.name}</h3>
                    <p className="flex items-center gap-1.5 text-body-md">
                      <Clock aria-hidden className="size-4 shrink-0 opacity-80" />
                      {eventTimes(event, wedding.timeZone)}
                    </p>
                    {place && (
                      <p className="flex gap-1.5 text-body-md">
                        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 opacity-80" />
                        <span className="min-w-0 wrap-break-word">{place}</span>
                      </p>
                    )}
                    {event.dressCode && (
                      <p className="self-start rounded-full border border-current/30 px-3 py-1 text-body-sm">
                        {THEME_COPY.dressCode(event.dressCode)}
                      </p>
                    )}
                    {event.mapUrl && (
                      <a
                        href={event.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "mt-auto pt-2 text-label-md underline underline-offset-4",
                          style.link,
                        )}
                      >
                        {THEME_COPY.maps}
                        <span className="sr-only"> ({event.name})</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {wedding.livestream.enabled && wedding.livestream.embedUrl && (
          <section
            aria-labelledby="modern-live"
            className="rounded-[32px] bg-linear-to-br from-burgundy to-burgundy-deep p-5 text-ivory md:p-8"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 id="modern-live" className="font-serif text-headline-md">
                {THEME_COPY.watchLive}
              </h2>
              <span className="rounded-full bg-gold-light px-3 py-0.5 text-label-sm tracking-widest text-burgundy-deep uppercase">
                {THEME_COPY.live}
              </span>
            </div>
            <p className="mb-5 text-body-md text-ivory/85">{THEME_COPY.watchLiveHint}</p>
            <YouTubePlayer
              embedUrl={wedding.livestream.embedUrl}
              title={THEME_COPY.playerTitle(title)}
              className="rounded-[20px]"
            />
          </section>
        )}

        {wedding.gallery.enabled && wedding.gallery.url && (
          <section
            aria-labelledby="modern-photos"
            className="flex flex-col items-start gap-3 rounded-[32px] bg-gold p-7 text-burgundy-deep md:flex-row md:items-center md:justify-between md:p-10"
          >
            <div>
              <h2
                id="modern-photos"
                className="flex items-center gap-2 font-serif text-headline-md"
              >
                <Camera aria-hidden className="size-7" />
                {THEME_COPY.photos}
              </h2>
              <p className="mt-1 text-body-md">{THEME_COPY.photosHint}</p>
            </div>
            <a
              href={wedding.gallery.url}
              rel="noreferrer"
              className="inline-flex h-12 items-center rounded-full bg-burgundy-deep px-6 text-label-md text-ivory hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {THEME_COPY.photosButton}
            </a>
          </section>
        )}
      </main>

      <footer className="flex flex-col items-center gap-2 px-4 pt-4 pb-12 text-center">
        <p className="font-serif text-title-lg text-burgundy">{THEME_COPY.withLove(title)}</p>
        <p className="text-body-sm text-plum">{THEME_COPY.madeWith}</p>
      </footer>
    </div>
  );
}
