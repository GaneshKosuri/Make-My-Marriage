import { cn } from "@/lib/cn";

const LEADING = {
  /** An event's date tile. */
  tile: "h-16 w-14 rounded-xl",
  /** A task's tick. */
  check: "size-6 rounded-full",
  /** A person's initials. */
  avatar: "size-10 rounded-full",
} as const;

/**
 * Placeholder rows while a list loads: a leading shape and two text lines per
 * row. `framed` draws its own white card; leave it off inside a DashboardCard.
 */
export function ListSkeleton({
  rows = 3,
  leading = "avatar",
  framed = true,
  heading = false,
}: Readonly<{
  rows?: number;
  leading?: keyof typeof LEADING;
  framed?: boolean;
  /** A title bar above the rows, as on a card with a heading. */
  heading?: boolean;
}>) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "animate-pulse",
        framed && "rounded-3xl border border-sand bg-white p-5 md:p-7",
      )}
    >
      {heading && <div className="mb-2 h-5 w-32 rounded bg-sand" />}
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-start gap-3 py-3">
          <div className={cn("shrink-0 bg-sand", LEADING[leading])} />
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="h-4 w-40 max-w-full rounded bg-sand" />
            <div className="h-3 w-56 max-w-full rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}
