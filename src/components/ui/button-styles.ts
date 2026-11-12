import { cn } from "@/lib/cn";

/**
 * Class strings for the app's buttons and links (dashboard style), shared by
 * every feature screen. Buttons are 44 px tall so they are easy to tap.
 */

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** Inline text link; `tap-target` gives it a 44 px hit area. */
export const textLink = cn(
  "tap-target inline-flex items-center gap-1.5 rounded text-label-md text-burgundy underline-offset-4 hover:underline",
  focusRing,
);

/** Burgundy pill: the one main action on a screen or in a form. */
export const primaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-label-md text-ivory hover:bg-burgundy-deep disabled:opacity-60",
  focusRing,
);

/** White outlined pill: cancel, retry and other secondary actions. */
export const secondaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
  focusRing,
);

/** Red outlined pill: starts a destructive action that a confirmation then repeats. */
export const dangerOutlineButton = cn(
  secondaryButton,
  "border-destructive/30 text-destructive hover:bg-destructive/5",
);

/** Solid red pill: the confirming button of a destructive action. */
export const dangerButton = cn(
  secondaryButton,
  "border-transparent bg-destructive text-white hover:bg-destructive/90",
);
