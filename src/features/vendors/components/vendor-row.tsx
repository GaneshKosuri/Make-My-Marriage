import { ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";

import { focusRing } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { initialsOf } from "@/lib/couple";
import { formatINR } from "@/lib/money";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { categoryLabel, VENDORS, VENDORS_ROUTES } from "../vendors-content";

/** "Photographer", in a quiet pill. */
export function CategoryPill({ vendor }: Readonly<{ vendor: Pick<VendorDto, "category"> }>) {
  return (
    <span className="inline-flex items-center rounded-full border border-sand bg-ivory px-2.5 py-0.5 text-label-sm whitespace-nowrap text-plum">
      {categoryLabel(vendor.category)}
    </span>
  );
}

/**
 * One vendor: initials, name (opens their page), category, contact, the
 * agreed cost and the events they work at, with an edit button.
 */
export function VendorRow({
  vendor,
  onEdit,
}: Readonly<{ vendor: VendorDto; onEdit?: (vendor: VendorDto) => void }>) {
  const contact = [vendor.contactPerson, vendor.phone].filter(Boolean).join(" · ");
  const archived = vendor.archivedAt !== null;
  return (
    <div className={cn("flex items-start gap-3 py-4", archived && "opacity-70")}>
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-sand bg-white text-label-md text-burgundy"
      >
        {initialsOf(vendor.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={VENDORS_ROUTES.vendor(vendor.id)}
            aria-label={VENDORS.open(vendor.name)}
            className={cn(
              "tap-target inline-flex min-w-0 items-center gap-1 rounded text-label-md wrap-anywhere text-graphite hover:text-burgundy",
              focusRing,
            )}
          >
            <span className="min-w-0">{vendor.name}</span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-plum" />
          </Link>
          <CategoryPill vendor={vendor} />
          {archived && (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-label-sm text-plum">
              {VENDORS.archived}
            </span>
          )}
        </div>
        {contact && (
          <p title={contact} className="mt-1 truncate text-body-sm text-plum">
            {contact}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {vendor.totalAgreedCostPaise !== null && (
            <span className="text-body-sm font-semibold text-graphite tabular-nums">
              {VENDORS.agreed(formatINR(vendor.totalAgreedCostPaise))}
            </span>
          )}
          {vendor.source === "GOOGLE_PLACES" && (
            <span className="text-body-sm text-plum">{VENDORS.fromGoogle}</span>
          )}
        </div>
        {vendor.events.length > 0 && (
          <ul aria-label={VENDORS.form.fields.events.label} className="mt-2 flex flex-wrap gap-1.5">
            {vendor.events.map((event) => (
              <li
                key={event.id}
                title={event.name}
                className={cn(
                  "max-w-full truncate rounded-md border border-sand px-2 py-0.5 text-body-sm",
                  event.archivedAt ? "text-plum line-through" : "text-graphite",
                )}
              >
                {event.archivedAt ? VENDORS.archivedEvent(event.name) : event.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onEdit && !archived && (
        <button
          type="button"
          onClick={() => onEdit(vendor)}
          aria-label={VENDORS.edit(vendor.name)}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-plum hover:bg-sand hover:text-burgundy",
            focusRing,
          )}
        >
          <Pencil aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
