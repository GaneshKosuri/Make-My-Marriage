import "server-only";

/**
 * Vendor discovery provider boundary (SYSTEM_DESIGN §33–36, §69, API_DESIGN §65–66).
 * Domain-agnostic: callers pass a search keyword; the vendors module maps its
 * VENDOR_CATEGORIES onto keywords.
 *
 * Searches are by place name ("Dehradun, Uttarakhand"), not coordinates: the
 * family types where to look and no distance is shown (decided 2026-11-18).
 */

export interface PlaceSearchInput {
  /** e.g. "wedding photographer" */
  keyword: string;
  /** Where to look, e.g. "Dehradun, Uttarakhand". */
  near: string;
  /** Optional free text from the user, e.g. "candid". */
  query?: string;
  maxResults?: number;
}

/** Only the fields our UI needs (API_DESIGN §66). */
export interface DiscoveredPlace {
  googlePlaceId: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  address: string | null;
}

export interface PlaceDetails extends DiscoveredPlace {
  phone: string | null;
  website: string | null;
}

export interface VendorDiscoveryService {
  readonly adapterName: string;
  search(input: PlaceSearchInput): Promise<DiscoveredPlace[]>;
  /**
   * Trusted details fetched server-side for "Add to My Vendors" (API_DESIGN §61).
   * Throws NOT_FOUND when the provider doesn't know the place.
   */
  getPlaceDetails(googlePlaceId: string): Promise<PlaceDetails>;
}
