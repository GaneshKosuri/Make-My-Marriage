import { cn } from "@/lib/cn";

/**
 * Classic Indian line-art: a lotus-and-diamond divider in gold. Decorative
 * only (hidden from screen readers).
 */
export function OrnamentDivider({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 24"
      className={cn("h-6 w-48 text-gold", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M4 12h76M160 12h76" />
      <path d="M86 12l6-5 6 5-6 5z" />
      <path d="M142 12l6-5 6 5-6 5z" />
      <path d="M120 3c-6 5-6 13 0 18 6-5 6-13 0-18z" />
      <path d="M120 12c-6-6-14-6-18 0 4 6 12 6 18 0zM120 12c6-6 14-6 18 0-4 6-12 6-18 0z" />
      <circle cx="120" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** A curling corner flourish for cards and the hero (mirrored per corner). */
export function OrnamentCorner({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      className={cn("size-12 text-gold", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M4 60V30C4 16 16 4 30 4h30" />
      <path d="M12 60V34c0-12 10-22 22-22h26" />
      <path d="M22 22c4-6 12-6 14 0-6 2-10 6-14 0z" />
      <circle cx="22" cy="22" r="1.6" fill="currentColor" />
    </svg>
  );
}
