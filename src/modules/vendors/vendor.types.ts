/**
 * Vendor DTOs and inputs (API_DESIGN §59–66). Isomorphic.
 */
import type { z } from "zod";

import type { VendorCategory, VendorSource } from "./vendor.constants";
import type {
  addVendorFromPlaceSchema,
  createVendorSchema,
  discoverySearchQuerySchema,
  listVendorsQuerySchema,
  updateVendorSchema,
} from "./vendor.schemas";

/** My Vendors response. Events include archived ones the vendor already had, in date order. */
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
  events: { id: string; name: string; startsAt: string; archivedAt: string | null }[];
  notes: string | null;
  source: VendorSource;
  googlePlaceId: string | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** A vendor as other records show it (expenses): name and category, archived or not. */
export interface VendorSummaryDto {
  id: string;
  name: string;
  category: VendorCategory;
  archivedAt: string | null;
}

export type ListVendorsQuery = z.output<typeof listVendorsQuerySchema>;
export type CreateVendorInput = z.output<typeof createVendorSchema>;
export type UpdateVendorInput = z.output<typeof updateVendorSchema>;

export type AddVendorFromPlaceInput = z.output<typeof addVendorFromPlaceSchema>;
export type VendorDiscoveryQuery = z.output<typeof discoverySearchQuerySchema>;

/** The wedding's vendor for a Google place, archived or not (one place per wedding). */
export interface MyVendorRef {
  id: string;
  archived: boolean;
}

/**
 * GET /api/vendor-discovery/search item (API_DESIGN §66). No coordinates: no
 * map or distance is shown (decided 2026-11-18).
 */
export interface DiscoveredVendorDto {
  googlePlaceId: string;
  name: string;
  rating: number | null;
  ratingCount: number | null;
  address: string | null;
  /** Set when this place is already in My Vendors. */
  myVendor: MyVendorRef | null;
}

/** GET /api/vendor-discovery/places/:placeId — what pre-fills the add form. */
export interface DiscoveredPlaceDetailsDto extends DiscoveredVendorDto {
  phone: string | null;
  website: string | null;
}
