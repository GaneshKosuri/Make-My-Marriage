import { YouTubePlayer } from "@/components/ui/youtube-player";

import {
  countdown,
  CoverImage,
  eventDayParts,
  eventPlace,
  eventTimes,
  siteTitle,
  THEME_COPY,
  weddingDayLong,
} from "../shared";
import type { ThemeProps } from "../types";

/**
 * "Minimal Elegant" (PRD §9.19): clean and quiet. Ivory, generous space, gold
 * hairlines, large refined type; burgundy only for small accents. Layout
 * follows the Stitch "Website Minimal" screen; colours are the brand tokens.
 */
export function MinimalTheme({ wedding }: Readonly<ThemeProps>) {
  const title = siteTitle(wedding);
  const days = countdown(wedding);
  return (
    <div className="min-h-dvh bg-ivory font-sans text-graphite">
      <main className="mx-auto flex max-w-[760px] flex-col gap-16 px-5 py-16 md:gap-24 md:py-24">
        <header className="flex flex-col items-center gap-4 text-center">
          <p className="text-eyebrow tracking-[0.3em] text-plum uppercase">
            {THEME_COPY.celebrating}
          </p>
          <h1 className="font-serif text-[2.75rem] leading-tight wrap-break-word md:text-[4.5rem]">
            {title}
          </h1>
          <p className="text-eyebrow tracking-[0.25em] text-plum uppercase">
            {weddingDayLong(wedding)}
            {wedding.place && ` · ${wedding.place}`}
          </p>
          {days && (
            <p className="rounded-full border border-gold/60 px-4 py-1 text-label-md text-gold-deep">
              {days}
            </p>
          )}
          <CoverImage
            wedding={wedding}
            className="mt-8 aspect-[4/5] w-full max-w-md rounded-[28px] object-cover md:aspect-[3/2] md:max-w-none"
          />
        </header>

        {(wedding.welcomeMessage || wedding.description) && (
          <section aria-labelledby="minimal-welcome" className="text-center">
            <h2 id="minimal-welcome" className="sr-only">
              {THEME_COPY.welcome}
            </h2>
            <hr className="mx-auto w-2/3 border-gold/40" />
            {wedding.welcomeMessage && (
              <p className="mx-auto my-8 max-w-xl font-serif text-title-lg leading-relaxed whitespace-pre-line italic md:text-headline-sm">
                {wedding.welcomeMessage}
              </p>
            )}
            {wedding.description && (
              <p className="mx-auto mb-8 max-w-xl text-body-md whitespace-pre-line text-plum">
                {wedding.description}
              </p>
            )}
            <hr className="mx-auto w-2/3 border-gold/40" />
          </section>
        )}

        <section aria-labelledby="minimal-events" className="flex flex-col gap-8">
          <h2 id="minimal-events" className="text-center font-serif text-headline-md">
            {THEME_COPY.events}
          </h2>
          {wedding.events.length === 0 ? (
            <p className="text-center text-body-lg text-plum">{THEME_COPY.noEvents}</p>
          ) : (
            <ol className="divide-y divide-gold/30 border-y border-gold/30">
              {wedding.events.map((event) => {
                const day = eventDayParts(event, wedding.timeZone);
                const place = eventPlace(event);
                return (
                  <li
                    key={`${event.name}-${event.startsAt}`}
                    className="grid grid-cols-[4rem_1fr] gap-4 py-7 md:grid-cols-[5.5rem_1fr]"
                  >
                    <p className="border-r border-gold/30 pr-4 text-center">
                      <span className="block font-serif text-headline-sm text-burgundy">
                        {day.day}
                      </span>
                      <span className="block text-eyebrow tracking-widest text-plum uppercase">
                        {day.month} {day.year}
                      </span>
                    </p>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <h3 className="font-serif text-title-lg wrap-break-word">{event.name}</h3>
                        <p className="text-body-sm text-plum">
                          {eventTimes(event, wedding.timeZone)}
                        </p>
                      </div>
                      {place && <p className="text-body-md wrap-break-word">{place}</p>}
                      {event.dressCode && (
                        <p className="text-body-sm text-plum">
                          {THEME_COPY.dressCode(event.dressCode)}
                        </p>
                      )}
                      {event.mapUrl && (
                        <a
                          href={event.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-label-md text-burgundy underline-offset-4 hover:underline"
                        >
                          {THEME_COPY.maps}
                          <span className="sr-only"> ({event.name})</span>
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {wedding.livestream.enabled && wedding.livestream.embedUrl && (
          <section
            aria-labelledby="minimal-live"
            className="flex flex-col items-center gap-3 text-center"
          >
            <h2 id="minimal-live" className="font-serif text-headline-md">
              {THEME_COPY.watchLive}
            </h2>
            <p className="text-body-md text-plum">{THEME_COPY.watchLiveHint}</p>
            <YouTubePlayer
              embedUrl={wedding.livestream.embedUrl}
              title={THEME_COPY.playerTitle(title)}
              className="mt-4 rounded-[20px]"
            />
          </section>
        )}

        {wedding.gallery.enabled && wedding.gallery.url && (
          <section
            aria-labelledby="minimal-photos"
            className="flex flex-col items-center gap-3 text-center"
          >
            <h2 id="minimal-photos" className="font-serif text-headline-md">
              {THEME_COPY.photos}
            </h2>
            <p className="text-body-md text-plum">{THEME_COPY.photosHint}</p>
            <a
              href={wedding.gallery.url}
              rel="noreferrer"
              className="mt-3 inline-flex h-12 items-center rounded-full border border-burgundy px-6 text-label-md text-burgundy hover:bg-burgundy hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {THEME_COPY.photosButton}
            </a>
          </section>
        )}
      </main>

      <footer className="mx-auto flex max-w-[760px] flex-col items-center gap-2 border-t border-gold/30 px-5 py-12 text-center">
        <p className="font-serif text-title-lg italic">{THEME_COPY.withLove(title)}</p>
        <p className="text-eyebrow tracking-widest text-plum uppercase">{THEME_COPY.madeWith}</p>
      </footer>
    </div>
  );
}
