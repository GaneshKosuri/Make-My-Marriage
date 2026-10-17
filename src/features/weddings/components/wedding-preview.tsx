import { CalendarDays, Hourglass, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { coupleDisplayName, weddingCountdownLabel } from "@/lib/couple";
import { daysUntil, formatDateOnly, isValidDateOnly } from "@/lib/dates";

import { CREATE_WEDDING } from "../create-wedding-content";

export interface WeddingPreviewValues {
  brideName: string;
  groomName: string;
  title: string;
  weddingDate: string;
  timeZone: string;
  city: string;
  state: string;
}

/**
 * Live preview of the wedding being created (Stitch "Create Wedding"). Empty
 * fields show placeholders; the countdown appears once a valid date is set.
 */
export function WeddingPreview({
  values,
  compact = false,
}: Readonly<{ values: WeddingPreviewValues; compact?: boolean }>) {
  const { preview } = CREATE_WEDDING;
  const hasNames = Boolean(values.brideName.trim() || values.groomName.trim());
  const couple =
    values.title.trim() ||
    (hasNames
      ? coupleDisplayName({
          brideName: values.brideName.trim() || "Bride",
          groomName: values.groomName.trim() || "Groom",
        })
      : null);
  const validDate = isValidDateOnly(values.weddingDate);
  const place = [values.city.trim(), values.state.trim()].filter(Boolean).join(", ");

  return (
    <section
      aria-label="Preview"
      className={cn(
        "rounded-3xl border border-sand bg-white shadow-[0_2px_8px_-2px_rgba(43,35,38,0.04)]",
        compact ? "p-4" : "p-6",
      )}
    >
      <p className="text-eyebrow text-gold-deep uppercase">{preview.eyebrow}</p>
      <p
        className={cn(
          "mt-2 font-serif break-words",
          compact ? "text-headline-sm" : "text-headline-md",
          couple ? "text-graphite" : "text-plum italic",
        )}
      >
        {couple ?? preview.placeholderCouple}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-plum">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays aria-hidden className="size-4" />
          {validDate ? formatDateOnly(values.weddingDate) : preview.placeholderDate}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin aria-hidden className="size-4" />
          {place || preview.placeholderCity}
        </span>
      </p>
      <hr className={cn("border-sand", compact ? "my-3" : "my-4")} />
      <p className="flex items-center gap-2 text-label-md text-gold-deep">
        <Hourglass aria-hidden className="size-4" />
        {validDate
          ? weddingCountdownLabel(daysUntil(values.weddingDate, values.timeZone))
          : preview.countdownPending}
      </p>
    </section>
  );
}
