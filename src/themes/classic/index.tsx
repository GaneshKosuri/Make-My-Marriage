import { CalendarDays, Camera, MapPin, Shirt } from "lucide-react";

import { YouTubePlayer } from "@/components/ui/youtube-player";

import {
  countdown,
  CoverImage,
  eventDate,
  eventPlace,
  eventTimes,
  siteTitle,
  THEME_COPY,
  weddingDayLong,
} from "../shared";
import type { ThemeProps } from "../types";
import { OrnamentCorner, OrnamentDivider } from "./ornament";

/**
 * "Classic Indian" (PRD §9.19): traditional and decorative. Burgundy and gold,
 * line-art ornaments, a centred symmetric layout. Layout follows the Stitch
 * "Website Classic" screens; colours are the brand tokens.
 */
export function ClassicTheme({ wedding }: Readonly<ThemeProps>) {
  const title = siteTitle(wedding);
  const days = countdown(wedding);
  return (
    <div className="min-h-dvh bg-ivory font-sans text-graphite">
      <header className="relative isolate flex min-h-[78svh] items-end justify-center overflow-hidden bg-linear-to-b from-burgundy to-burgundy-deep px-6 pt-24 pb-14 text-center text-ivory md:min-h-[86svh]">
        <CoverImage wedding={wedding} className="absolute inset-0 -z-20 size-full object-cover" />
        {wedding.coverImageUrl && (
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-burgundy/30 via-burgundy/55 to-burgundy-deep/95" />
        )}
        <OrnamentCorner className="absolute top-5 left-5 text-gold-light" />
        <OrnamentCorner className="absolute top-5 right-5 -scale-x-100 text-gold-light" />
        <div className="flex max-w-2xl flex-col items-center gap-3">
          <p className="font-serif text-title-md tracking-wide text-gold-light">॥ शुभ विवाह ॥</p>
          <h1 className="font-serif text-[2.6rem] leading-tight wrap-break-word md:text-display">
            {title}
          </h1>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-body-lg text-ivory/90">
            <CalendarDays aria-hidden className="size-4 text-gold-light" />
            {weddingDayLong(wedding)}
            {wedding.place && <span aria-hidden>·</span>}
            {wedding.place}
          </p>
          {days && (
            <p className="mt-2 rounded-full border border-gold-light/70 bg-white/10 px-4 py-1.5 text-label-md tracking-widest text-gold-light uppercase">
              {days}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-14 px-4 py-14 md:gap-20 md:py-20">
        {(wedding.welcomeMessage || wedding.description) && (
          <section
            aria-labelledby="classic-welcome"
            className="relative mx-auto w-full max-w-2xl rounded-3xl border border-gold/50 bg-white px-6 py-10 text-center shadow-sm md:px-12"
          >
            <OrnamentCorner className="absolute top-3 left-3 size-8" />
            <OrnamentCorner className="absolute top-3 right-3 size-8 -scale-x-100" />
            <OrnamentDivider className="mx-auto" />
            <h2 id="classic-welcome" className="mt-3 font-serif text-headline-sm text-burgundy">
              {THEME_COPY.welcome}
            </h2>
            {wedding.welcomeMessage && (
              <p className="mt-4 text-body-lg whitespace-pre-line text-graphite">
                {wedding.welcomeMessage}
              </p>
            )}
            {wedding.description && (
              <p className="mt-3 text-body-md whitespace-pre-line text-plum">
                {wedding.description}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="classic-events" className="flex flex-col items-center gap-8">
          <div className="text-center">
            <OrnamentDivider className="mx-auto" />
            <h2 id="classic-events" className="mt-3 font-serif text-headline-md text-burgundy">
              {THEME_COPY.events}
            </h2>
          </div>
          {wedding.events.length === 0 ? (
            <p className="text-body-lg text-plum">{THEME_COPY.noEvents}</p>
          ) : (
            <ol className="grid w-full gap-4 md:grid-cols-2 md:gap-6">
              {wedding.events.map((event, index) => {
                const place = eventPlace(event);
                return (
                  <li
                    key={`${event.name}-${event.startsAt}`}
                    className="relative flex gap-4 rounded-3xl border border-gold/40 bg-white p-5 shadow-sm md:p-6"
                  >
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gold bg-ivory font-serif text-burgundy"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="font-serif text-title-lg text-burgundy wrap-break-word">
                        {event.name}
                      </h3>
                      <p className="text-body-md">
                        {eventDate(event, wedding.timeZone)} · {eventTimes(event, wedding.timeZone)}
                      </p>
                      {place && (
                        <p className="flex gap-1.5 text-body-md text-plum">
                          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
                          <span className="min-w-0 wrap-break-word">{place}</span>
                        </p>
                      )}
                      {event.dressCode && (
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-body-sm text-graphite">
                          <Shirt aria-hidden className="size-3.5 text-gold-deep" />
                          {THEME_COPY.dressCode(event.dressCode)}
                        </p>
                      )}
                      {event.mapUrl && (
                        <p>
                          <a
                            href={event.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-label-md text-burgundy underline-offset-4 hover:underline"
                          >
                            {THEME_COPY.maps}
                            <span className="sr-only"> ({event.name})</span>
                          </a>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {wedding.livestream.enabled && wedding.livestream.embedUrl && (
          <section aria-labelledby="classic-live" className="mx-auto w-full max-w-3xl text-center">
            <OrnamentDivider className="mx-auto" />
            <h2 id="classic-live" className="mt-3 font-serif text-headline-md text-burgundy">
              {THEME_COPY.watchLive}
            </h2>
            <p className="mt-2 text-body-md text-plum">{THEME_COPY.watchLiveHint}</p>
            <div className="mt-6 rounded-3xl border-2 border-gold/60 bg-white p-2 shadow-sm">
              <YouTubePlayer
                embedUrl={wedding.livestream.embedUrl}
                title={THEME_COPY.playerTitle(title)}
                className="rounded-2xl"
              />
            </div>
          </section>
        )}

        {wedding.gallery.enabled && wedding.gallery.url && (
          <section
            aria-labelledby="classic-photos"
            className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-3xl bg-linear-to-br from-burgundy to-burgundy-deep px-6 py-10 text-center text-ivory"
          >
            <Camera aria-hidden className="size-8 text-gold-light" />
            <h2 id="classic-photos" className="font-serif text-headline-sm">
              {THEME_COPY.photos}
            </h2>
            <p className="text-body-md text-ivory/85">{THEME_COPY.photosHint}</p>
            <a
              href={wedding.gallery.url}
              rel="noreferrer"
              className="mt-2 inline-flex h-12 items-center rounded-full bg-gold-light px-6 text-label-md text-burgundy-deep hover:bg-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light"
            >
              {THEME_COPY.photosButton}
            </a>
          </section>
        )}
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-gold/30 px-4 py-12 text-center">
        <OrnamentDivider />
        <p className="font-serif text-title-lg text-burgundy">{THEME_COPY.withLove(title)}</p>
        <p className="text-body-sm text-plum">{THEME_COPY.madeWith}</p>
      </footer>
    </div>
  );
}
