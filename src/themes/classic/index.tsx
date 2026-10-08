import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";

import { formatEventTime, GalleryAndLivestreamPlaceholders } from "../shared";
import type { ThemeProps } from "../types";

/** "Classic Indian": traditional, decorative (PRD §9.19). Placeholder styling. */
export function ClassicTheme({ wedding }: Readonly<ThemeProps>) {
  return (
    <div className="min-h-dvh bg-amber-50 px-4 py-12 text-amber-950">
      <div className="mx-auto max-w-2xl space-y-10 rounded-2xl border-4 border-double border-amber-700 bg-white/80 p-6 text-center sm:p-10">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.3em] text-amber-700 uppercase">
            Together with their families
          </p>
          <h1 className="font-serif text-4xl font-semibold">{coupleDisplayName(wedding)}</h1>
          <p className="font-serif text-lg">{formatDateOnly(wedding.weddingDate)}</p>
        </header>
        {wedding.welcomeMessage && <p className="font-serif italic">{wedding.welcomeMessage}</p>}
        <section aria-label="Events" className="space-y-4">
          <h2 className="font-serif text-2xl">Celebrations</h2>
          <ul className="space-y-3">
            {wedding.events.map((event) => (
              <li
                key={event.name + event.startsAt}
                className="rounded-lg border border-amber-200 p-4"
              >
                <p className="font-serif text-xl">{event.name}</p>
                <p className="text-sm">{formatEventTime(event, wedding.timeZone)}</p>
                {event.venueName && <p className="text-sm">{event.venueName}</p>}
                {event.dressCode && <p className="text-xs">Dress code: {event.dressCode}</p>}
              </li>
            ))}
          </ul>
        </section>
        <GalleryAndLivestreamPlaceholders
          galleryEnabled={wedding.gallery.enabled}
          livestreamEnabled={wedding.livestream.enabled}
        />
      </div>
    </div>
  );
}
