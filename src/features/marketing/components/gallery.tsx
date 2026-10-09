import { BookImage, QrCode } from "lucide-react";

import { cn } from "@/lib/cn";

import { isComingSoon } from "../feature-availability";
import { GALLERY } from "../home-content";
import { ComingSoonBadge, Section, SectionIntro } from "./section";

export function Gallery() {
  return (
    <Section labelledBy="gallery-title">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between lg:mb-14 lg:gap-6">
        <SectionIntro
          headingId="gallery-title"
          eyebrow={GALLERY.eyebrow}
          icon={GALLERY.icon}
          title={GALLERY.title}
          intro={GALLERY.intro}
          className="mb-0 lg:mb-0"
        />
        <div className="mb-6 flex flex-wrap items-center gap-2 md:mb-0 lg:gap-3">
          {!isComingSoon("organiserGallery") && (
            <span className="flex items-center gap-1.5 rounded-full border border-sand bg-sand px-2.5 py-0.5 text-[11px] font-semibold text-burgundy lg:px-3.5 lg:py-1.5 lg:text-label-md">
              <span className="size-2 rounded-full bg-burgundy" />
              {GALLERY.organiserLive}
            </span>
          )}
          <span className="flex items-center gap-2 rounded-full border border-sand bg-white px-2.5 py-0.5 text-[11px] font-semibold text-graphite lg:px-3.5 lg:py-1.5 lg:text-label-md">
            {GALLERY.guestUploads}
            <ComingSoonBadge feature="guestPhotoUploads" />
          </span>
        </div>
      </div>

      <div className="grid items-center gap-4 lg:grid-cols-12 lg:gap-6">
        <ul className="grid grid-cols-2 gap-2.5 lg:col-span-8 lg:gap-4">
          {GALLERY.albums.map((album, index) => (
            <li
              key={album.name}
              className={cn(
                "flex h-32 flex-col justify-between rounded-2xl border border-sand p-4 shadow-sm lg:h-48 lg:rounded-3xl lg:p-6",
                // Alternate tones like the design: white, sand, sand, white.
                index === 1 || index === 2 ? "bg-sand" : "bg-white",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-eyebrow text-gold-deep uppercase">
                  Album {String(index + 1).padStart(2, "0")}
                </span>
                <BookImage aria-hidden className="size-5 text-burgundy" />
              </div>
              <div>
                <h3 className="font-serif text-[15px] font-semibold text-burgundy lg:text-headline-sm">
                  {album.name}
                </h3>
                <p className="mt-1 text-body-sm text-plum">{album.photos}</p>
              </div>
            </li>
          ))}
        </ul>

        <QrCard className="lg:col-span-4" />
      </div>
    </Section>
  );
}

/** The printable table-stand QR card (guest uploads land in a later phase). */
function QrCard({ className }: Readonly<{ className?: string }>) {
  const { qr } = GALLERY;
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-sand bg-white p-5 text-center shadow-lg lg:rounded-3xl lg:p-8",
        className,
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-eyebrow text-gold-deep uppercase">{qr.label}</span>
        <ComingSoonBadge feature="guestPhotoUploads" />
      </div>
      <h3 className="mb-2 font-serif text-headline-sm text-burgundy">{qr.title}</h3>
      <p className="mb-5 max-w-xs text-body-sm text-plum">{qr.text}</p>
      <div className="mb-4 flex size-32 items-center justify-center rounded-2xl border border-sand bg-ivory lg:size-40">
        <QrCode aria-hidden strokeWidth={1.25} className="size-24 text-burgundy lg:size-28" />
      </div>
      <p className="mb-2 rounded-full border border-sand bg-sand px-3.5 py-1 text-label-md text-burgundy">
        {qr.badge}
      </p>
      <p className="text-label-sm text-plum">{qr.meta}</p>
      <p className="mt-1 text-label-sm font-semibold text-gold-deep">{qr.action}</p>
    </div>
  );
}
