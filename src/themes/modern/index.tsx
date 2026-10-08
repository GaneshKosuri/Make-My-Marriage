import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";

import { formatEventTime, GalleryAndLivestreamPlaceholders } from "../shared";
import type { ThemeProps } from "../types";

/** "Modern Celebration": contemporary, colourful (PRD §9.19). Placeholder styling. */
export function ModernTheme({ wedding }: Readonly<ThemeProps>) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-fuchsia-100 via-orange-50 to-teal-100 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="rounded-3xl bg-white/70 p-8 shadow-sm backdrop-blur">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{coupleDisplayName(wedding)}</h1>
          <p className="mt-2 text-lg font-medium text-fuchsia-700">
            {formatDateOnly(wedding.weddingDate)}
          </p>
          {wedding.welcomeMessage && <p className="mt-4">{wedding.welcomeMessage}</p>}
        </header>
        <section aria-label="Events" className="grid gap-4 sm:grid-cols-2">
          {wedding.events.map((event) => (
            <article
              key={event.name + event.startsAt}
              className="rounded-2xl bg-white/80 p-5 shadow-sm"
            >
              <h2 className="text-xl font-bold">{event.name}</h2>
              <p className="text-sm">{formatEventTime(event, wedding.timeZone)}</p>
              {event.venueName && <p className="text-sm">{event.venueName}</p>}
              {event.dressCode && (
                <p className="mt-2 inline-block rounded-full bg-teal-100 px-3 py-1 text-xs">
                  {event.dressCode}
                </p>
              )}
            </article>
          ))}
        </section>
        <div className="space-y-6 rounded-3xl bg-white/70 p-6">
          <GalleryAndLivestreamPlaceholders
            galleryEnabled={wedding.gallery.enabled}
            livestreamEnabled={wedding.livestream.enabled}
          />
        </div>
      </div>
    </div>
  );
}
