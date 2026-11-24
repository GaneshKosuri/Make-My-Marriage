import { formatInstant } from "@/lib/dates";
import { YouTubePlayer } from "@/components/ui/youtube-player";
import type { PublicWebsiteEventDto, PublicWeddingDto } from "@/modules/weddings/wedding.types";

/** "Sat, 13 Feb 2027, 7:30 pm" in the wedding's time zone. */
export function formatEventTime(event: PublicWebsiteEventDto, timeZone: string): string {
  const start = formatInstant(event.startsAt, timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!event.endsAt) return start;
  const end = formatInstant(event.endsAt, timeZone, { hour: "numeric", minute: "2-digit" });
  return `${start} – ${end}`;
}

/** The livestream and gallery sections every theme shows, so all themes stay content-identical. */
export function LivestreamAndGallery({ wedding }: Readonly<{ wedding: PublicWeddingDto }>) {
  return (
    <>
      {wedding.livestream.enabled && wedding.livestream.embedUrl && (
        <section aria-labelledby="website-livestream" className="space-y-3">
          <h2 id="website-livestream" className="font-serif text-2xl">
            Watch live
          </h2>
          <p className="text-sm">Can&apos;t be there? Watch the ceremony live.</p>
          <YouTubePlayer
            embedUrl={wedding.livestream.embedUrl}
            title={`${wedding.title ?? "Wedding"} livestream`}
            className="rounded-xl"
          />
        </section>
      )}
      {wedding.gallery.enabled && wedding.gallery.url && (
        <section aria-labelledby="website-photos" className="space-y-3">
          <h2 id="website-photos" className="font-serif text-2xl">
            Wedding photos
          </h2>
          <p className="text-sm">See the photos and add your own.</p>
          <a
            href={wedding.gallery.url}
            rel="noreferrer"
            className="inline-flex h-11 items-center rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory"
          >
            See and add photos
          </a>
        </section>
      )}
    </>
  );
}
