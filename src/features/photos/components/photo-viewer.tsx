"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { focusRing } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { formatInstant } from "@/lib/dates";
import type { PhotoDto } from "@/modules/photos/photo.types";

import { GALLERY } from "../gallery-content";

const VIEWER = GALLERY.viewer;
const DATE = { day: "numeric", month: "short", year: "numeric" } as const;

const iconButton = cn(
  "flex size-11 items-center justify-center rounded-full bg-white/10 text-ivory hover:bg-white/20",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light",
);

/**
 * The full-screen photo viewer: the original photo, previous/next (buttons and
 * arrow keys), its album and who added it. Escape or Close returns to the grid.
 */
export function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  albumOf,
  timeZone,
  actions,
}: Readonly<{
  photos: readonly PhotoDto[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  albumOf: (photo: PhotoDto) => string;
  timeZone: string;
  actions?: (photo: PhotoDto) => ReactNode;
}>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];
  const hasPrevious = index > 0;
  const hasNext = index < photos.length - 1;

  // Latest values for the key handler, without re-binding it on every photo.
  const state = useRef({ index, hasPrevious, hasNext, onIndex, onClose });
  useEffect(() => {
    state.current = { index, hasPrevious, hasNext, onIndex, onClose };
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const current = state.current;
      if (event.key === "Escape") current.onClose();
      if (event.key === "ArrowLeft" && current.hasPrevious) current.onIndex(current.index - 1);
      if (event.key === "ArrowRight" && current.hasNext) current.onIndex(current.index + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  if (!photo) return null;
  const date = formatInstant(photo.createdAt, timeZone, DATE);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={VIEWER.label}
      className="fixed inset-0 z-50 flex flex-col bg-graphite/95 text-ivory"
    >
      <div className="flex justify-end p-3">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={VIEWER.close}
          className={iconButton}
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={GALLERY.photoName(photo.originalFilename)}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
        {hasPrevious && (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            aria-label={VIEWER.previous}
            className={cn(iconButton, "absolute top-1/2 left-2 -translate-y-1/2 md:left-4")}
          >
            <ChevronLeft aria-hidden className="size-6" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            aria-label={VIEWER.next}
            className={cn(iconButton, "absolute top-1/2 right-2 -translate-y-1/2 md:right-4")}
          >
            <ChevronRight aria-hidden className="size-6" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:px-8">
        <div className="min-w-0">
          <p className="text-title-md font-semibold wrap-break-word">{albumOf(photo)}</p>
          <p className="text-body-sm text-ivory/75">
            {photo.uploaderType === "GUEST" ? VIEWER.byGuest(date) : VIEWER.byFamily(date)}
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions(photo)}</div>}
      </div>
    </div>
  );
}

/** Outlined pills for the viewer's dark footer. */
export const viewerButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gold-light px-5 text-label-md text-ivory hover:bg-white/10 disabled:opacity-60",
  focusRing,
);
export const viewerDangerButton = cn(
  viewerButton,
  "border-[#e8a3a3] text-[#f4c7c7] hover:bg-destructive/30",
);
