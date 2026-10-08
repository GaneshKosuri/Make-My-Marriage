import { formatInstant } from "@/lib/dates";
import type { PublicWebsiteEventDto } from "@/modules/weddings/wedding.types";

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

/** Section stubs every theme shows, so all themes stay content-identical. */
export function GalleryAndLivestreamPlaceholders({
  galleryEnabled,
  livestreamEnabled,
}: Readonly<{ galleryEnabled: boolean; livestreamEnabled: boolean }>) {
  return (
    <>
      {galleryEnabled && (
        <section aria-label="Gallery" className="opacity-80">
          <h2 className="text-lg font-semibold">Gallery</h2>
          <p className="text-sm">Shared photos appear here (Phase 6: Memories).</p>
        </section>
      )}
      {livestreamEnabled && (
        <section aria-label="Live stream" className="opacity-80">
          <h2 className="text-lg font-semibold">Live stream</h2>
          <p className="text-sm">The YouTube player appears here (Phase 5: Wedding Experience).</p>
        </section>
      )}
    </>
  );
}
