/**
 * Vendor DTOs and inputs (API_DESIGN §59–66). Isomorphic.
 * TODO(Phase 4): derive inputs from ./vendor.schemas.ts with z.infer.
 */
import type { PageQuery } from "@/lib/pagination";

import type { VendorCategory, VendorSource } from "./vendor.constants";

export interface VendorDto {
  id: string;
  name: string;
  category: VendorCategory;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  totalAgreedCostPaise: number | null;
  events: { id: string; name: string }[];
  notes: string | null;
  source: VendorSource;
  googlePlaceId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListVendorsQuery extends PageQuery {
  category?: VendorCategory;
  search?: string;
  includeArchived?: boolean;
}

export interface CreateVendorInput {
  name: string;
  category: VendorCategory;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  totalAgreedCostPaise?: number | null;
  eventIds?: string[];
  notes?: string | null;
}

export type UpdateVendorInput = Partial<CreateVendorInput>;

export interface AddVendorFromPlaceInput {
  googlePlaceId: string;
  category?: VendorCategory;
}

export interface VendorDiscoveryQuery {
  category: VendorCategory;
  query?: string;
  latitude?: number;
  longitude?: number;
}

/** GET /api/vendor-discovery/search item (API_DESIGN §66). */
export interface DiscoveredVendorDto {
  googlePlaceId: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}
