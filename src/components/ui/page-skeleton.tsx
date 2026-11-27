import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { ListSkeleton } from "./list-skeleton";

/**
 * The frame of a dashboard page while it loads: the same width and header as
 * the screen itself, so nothing jumps when the data arrives. Text the page
 * knows up front (eyebrow, title, description) is shown for real; anything that
 * depends on the data is a placeholder bar. Used as the page's Suspense
 * fallback, so navigating shows it immediately instead of a blank area.
 */
export function PageSkeleton({
  wide = false,
  eyebrow,
  title,
  description,
  action = false,
  above,
  children,
}: Readonly<{
  /** 1100px pages (gallery, website, livestream); others are 960px. */
  wide?: boolean;
  eyebrow?: string;
  /** A placeholder bar when the title comes with the data. */
  title?: string;
  description?: string;
  /** A placeholder for the header's main button. */
  action?: boolean;
  /** Shown above the header, e.g. a back link. */
  above?: ReactNode;
  /** The body; a list placeholder by default. */
  children?: ReactNode;
}>) {
  const hasHeader = Boolean(eyebrow || title || description || action);
  return (
    <div
      aria-busy="true"
      className={cn(
        "mx-auto flex w-full flex-col gap-4 md:gap-6",
        wide ? "max-w-[1100px]" : "max-w-[960px]",
      )}
    >
      {above}
      {hasHeader && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-eyebrow text-gold-deep uppercase">{eyebrow}</p>
            ) : (
              <SkeletonBar className="h-3 w-20" />
            )}
            {title ? (
              <p className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
                {title}
              </p>
            ) : (
              <SkeletonBar className="mt-2 h-9 w-56" />
            )}
            {description && <p className="mt-1 text-body-md text-plum">{description}</p>}
          </div>
          {action && <SkeletonBar className="h-11 w-36 rounded-full" />}
        </div>
      )}
      {children ?? <ListSkeleton rows={4} />}
    </div>
  );
}

/** One pulsing placeholder shape. */
export function SkeletonBar({ className }: Readonly<{ className?: string }>) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-sand", className)} />;
}

/** A pulsing placeholder card of a given height (forms, panels, previews). */
export function SkeletonCard({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-3xl border border-sand bg-white p-5 md:p-7", className)}
    >
      <div className="h-5 w-40 rounded bg-sand" />
      <div className="mt-5 space-y-3">
        <div className="h-4 w-3/4 rounded bg-sand" />
        <div className="h-4 w-1/2 rounded bg-sand" />
        <div className="h-4 w-2/3 rounded bg-sand" />
      </div>
    </div>
  );
}

/**
 * A guest's invitation or the guest gallery while it loads (inside GuestShell):
 * the burgundy header card, then content cards or photo tiles.
 */
export function GuestPageSkeleton({ photos = false }: Readonly<{ photos?: boolean }>) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-5">
      <div className="flex h-44 animate-pulse flex-col items-center justify-center gap-3 rounded-3xl bg-linear-to-br from-burgundy to-burgundy-deep px-6">
        <div className="h-3 w-24 rounded bg-ivory/25" />
        <div className="h-8 w-56 max-w-full rounded bg-ivory/30" />
        <div className="h-3 w-32 rounded bg-ivory/25" />
      </div>
      {photos ? (
        <div className="grid grid-cols-3 gap-1 sm:gap-2">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-sand" />
          ))}
        </div>
      ) : (
        <>
          <SkeletonCard className="h-36" />
          <SkeletonCard className="h-56" />
        </>
      )}
    </div>
  );
}

/** A published wedding website (or its members-only preview) while it loads. */
export function PublicWebsiteSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="min-h-dvh bg-ivory">
      <div className="flex h-[55dvh] animate-pulse flex-col items-center justify-center gap-4 bg-linear-to-br from-burgundy to-burgundy-deep px-6">
        <div className="h-4 w-48 rounded-full bg-ivory/25" />
        <div className="h-12 w-72 max-w-full rounded bg-ivory/30" />
        <div className="h-6 w-28 rounded bg-ivory/25" />
      </div>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-12">
        <SkeletonCard className="h-40" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>
      </div>
    </div>
  );
}

/** Create Wedding and Join while the session is checked: a centred form card. */
export function OnboardingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="min-h-dvh bg-ivory px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="mx-auto h-10 w-48 animate-pulse rounded bg-sand" />
        <SkeletonCard className="h-96" />
      </div>
    </div>
  );
}
