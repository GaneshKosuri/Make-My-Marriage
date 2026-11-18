/**
 * Reads /app/vendors search params into filters, ignoring anything unexpected
 * (a stale or hand-edited link just shows every active vendor).
 */
import {
  VENDOR_CATEGORIES,
  VENDOR_SEARCH_MAX_LENGTH,
  type VendorCategory,
} from "@/modules/vendors/vendor.constants";

import { VENDORS_PARAMS } from "./vendors-content";

type SearchParams = Record<string, string | string[] | undefined>;

export interface VendorFilters {
  search?: string;
  category?: VendorCategory;
  /** "1" when archived vendors are shown too, as the address carries it. */
  archived?: "1";
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function readVendorsUrl(params: SearchParams): {
  filters: VendorFilters;
  startAdding: boolean;
} {
  const search = first(params[VENDORS_PARAMS.search])?.trim().slice(0, VENDOR_SEARCH_MAX_LENGTH);
  const category = first(params[VENDORS_PARAMS.category]);
  const filters: VendorFilters = {
    search: search || undefined,
    category: VENDOR_CATEGORIES.includes(category as VendorCategory)
      ? (category as VendorCategory)
      : undefined,
    archived: first(params[VENDORS_PARAMS.archived]) === "1" ? "1" : undefined,
  };
  for (const key of Object.keys(filters) as (keyof VendorFilters)[]) {
    if (filters[key] === undefined) delete filters[key];
  }
  return { filters, startAdding: first(params[VENDORS_PARAMS.add]) === "1" };
}

/** The address for these filters, so the list can be shared or reloaded. */
export function vendorsUrlFor(list: string, filters: VendorFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${list}?${search}` : list;
}
