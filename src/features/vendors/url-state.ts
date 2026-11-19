/**
 * Reads /app/vendors search params into filters, ignoring anything unexpected
 * (a stale or hand-edited link just shows every active vendor).
 */
import {
  VENDOR_CATEGORIES,
  VENDOR_DISCOVERY_NEAR_MAX_LENGTH,
  VENDOR_DISCOVERY_QUERY_MAX_LENGTH,
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

/** A discovery search as the address carries it: /app/vendors/discover?category=VENUE&near=Jaipur&q=lawns */
export interface DiscoverSearch {
  category: VendorCategory;
  near: string;
  query?: string;
}

const DISCOVER_PARAMS = { category: "category", near: "near", query: "q" } as const;

/**
 * The search in the address, so Back from a vendor shows the same results
 * (from the cache, without asking Google again). Null when incomplete.
 */
export function readDiscoverUrl(params: SearchParams): DiscoverSearch | null {
  const category = first(params[DISCOVER_PARAMS.category]);
  const near = first(params[DISCOVER_PARAMS.near])
    ?.trim()
    .slice(0, VENDOR_DISCOVERY_NEAR_MAX_LENGTH);
  const query = first(params[DISCOVER_PARAMS.query])
    ?.trim()
    .slice(0, VENDOR_DISCOVERY_QUERY_MAX_LENGTH);
  if (!VENDOR_CATEGORIES.includes(category as VendorCategory) || !near) return null;
  return { category: category as VendorCategory, near, ...(query && { query }) };
}

export function discoverUrlFor(path: string, search: DiscoverSearch): string {
  const params = new URLSearchParams({
    [DISCOVER_PARAMS.category]: search.category,
    [DISCOVER_PARAMS.near]: search.near,
  });
  if (search.query) params.set(DISCOVER_PARAMS.query, search.query);
  return `${path}?${params.toString()}`;
}
