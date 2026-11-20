"use client";

import type { ReactNode } from "react";

import { focusRing } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import type { PhotoDto } from "@/modules/photos/photo.types";

import { GALLERY } from "../gallery-content";

/**
 * Square tiles showing each photo's small preview (the original when it has
 * none). Tapping a tile opens the viewer. `actions` adds buttons that appear
 * on hover or keyboard focus (not on touch screens; the viewer has them).
 */
export function PhotoGrid({
  photos,
  onOpen,
  actions,
  className,
}: Readonly<{
  photos: readonly PhotoDto[];
  onOpen: (index: number) => void;
  actions?: (photo: PhotoDto) => ReactNode;
  className?: string;
}>) {
  return (
    <ul className={cn("grid grid-cols-3 gap-1 sm:gap-2 md:grid-cols-4", className)}>
      {photos.map((photo, index) => {
        const name = GALLERY.photoName(photo.originalFilename);
        return (
          <li
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-xl bg-sand sm:rounded-2xl"
          >
            <button
              type="button"
              onClick={() => onOpen(index)}
              aria-label={GALLERY.open(name)}
              className={cn("block size-full", focusRing, "focus-visible:outline-offset-[-2px]")}
            >
              {/* Signed, short-lived storage links: next/image cannot optimise them. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl ?? photo.url}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
            {photo.uploaderType === "GUEST" && (
              <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-lg bg-ivory/90 px-2 py-0.5 text-label-sm text-graphite sm:bottom-2 sm:left-2">
                {GALLERY.guestTag}
              </span>
            )}
            {actions && (
              <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden">
                {actions(photo)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** A round icon button for a tile's corner. */
export function TileAction({
  label,
  onClick,
  children,
  danger = false,
}: Readonly<{ label: string; onClick: () => void; children: ReactNode; danger?: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white/95 shadow-md hover:bg-ivory",
        danger ? "text-destructive" : "text-graphite",
        focusRing,
      )}
    >
      {children}
    </button>
  );
}
