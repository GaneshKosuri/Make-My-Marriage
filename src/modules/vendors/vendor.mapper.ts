import "server-only";

import type { EventSummaryDto } from "@/modules/events/event.types";

import type { VendorRecord } from "./vendor.model";
import type { VendorDto, VendorSummaryDto } from "./vendor.types";

/**
 * Vendor document → DTO (API_DESIGN §59–64). Built field by field. Linked
 * events are listed by date, archived ones included; one that no longer
 * exists is left out.
 */
export function toVendorDto(
  vendor: VendorRecord,
  events: ReadonlyMap<string, EventSummaryDto>,
): VendorDto {
  return {
    id: vendor._id.toString(),
    name: vendor.name,
    category: vendor.category,
    contactPerson: vendor.contactPerson ?? null,
    phone: vendor.phone ?? null,
    email: vendor.email ?? null,
    address: vendor.address ?? null,
    website: vendor.website ?? null,
    totalAgreedCostPaise: vendor.totalAgreedCostPaise ?? null,
    events: vendor.eventIds
      .flatMap((id) => {
        const event = events.get(id.toString());
        return event ? [event] : [];
      })
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id)),
    notes: vendor.notes ?? null,
    source: vendor.source,
    googlePlaceId: vendor.googlePlaceId ?? null,
    archivedAt: vendor.archivedAt?.toISOString() ?? null,
    version: vendor.__v,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

export function toVendorSummaryDto(vendor: VendorRecord): VendorSummaryDto {
  return {
    id: vendor._id.toString(),
    name: vendor.name,
    category: vendor.category,
    archivedAt: vendor.archivedAt?.toISOString() ?? null,
  };
}
