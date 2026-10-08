import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";

import { formatEventTime, GalleryAndLivestreamPlaceholders } from "../shared";
import type { ThemeProps } from "../types";

/** "Minimal Elegant": clean typography, elegant layout (PRD §9.19). Placeholder styling. */
export function MinimalTheme({ wedding }: Readonly<ThemeProps>) {
  return (
    <div className="min-h-dvh bg-white px-6 py-16 text-neutral-900">
      <div className="mx-auto max-w-xl space-y-14">
        <header className="space-y-3 border-b pb-10">
          <h1 className="text-4xl font-light tracking-tight">{coupleDisplayName(wedding)}</h1>
          <p className="text-sm tracking-widest text-neutral-500 uppercase">
            {formatDateOnly(wedding.weddingDate)}
          </p>
        </header>
        {wedding.welcomeMessage && <p className="leading-relaxed">{wedding.welcomeMessage}</p>}
        <section aria-label="Events" className="space-y-6">
          <h2 className="text-xs tracking-widest text-neutral-500 uppercase">Events</h2>
          <ul className="divide-y">
            {wedding.events.map((event) => (
              <li key={event.name + event.startsAt} className="py-4">
                <p className="font-medium">{event.name}</p>
                <p className="text-sm text-neutral-500">
                  {formatEventTime(event, wedding.timeZone)}
                </p>
                {event.venueName && <p className="text-sm text-neutral-500">{event.venueName}</p>}
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
