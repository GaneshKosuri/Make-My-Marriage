import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { notImplemented } from "@/server/errors";

import type {
  AddVendorFromPlaceInput,
  CreateVendorInput,
  ListVendorsQuery,
  UpdateVendorInput,
  VendorDto,
} from "./vendor.types";

/** My Vendors (PRD §9.16; SYSTEM_DESIGN §33, §36; API_DESIGN §59–64). Phase 4. */
export const vendorsService = {
  /** API §59. */
  async list(ctx: MemberContext, query: ListVendorsQuery): Promise<PageResult<VendorDto>> {
    return notImplemented("API_DESIGN §59 (Phase 4: Financial & Vendors)");
  },

  /** source = MANUAL. API §60. */
  async create(ctx: MemberContext, input: CreateVendorInput): Promise<VendorDto> {
    return notImplemented("API_DESIGN §60 (Phase 4: Financial & Vendors)");
  },

  /**
   * Fetches trusted details server-side via getVendorDiscoveryService().getPlaceDetails
   * — never trusts client metadata. source = GOOGLE_PLACES; duplicate place → CONFLICT. API §61.
   */
  async createFromPlace(ctx: MemberContext, input: AddVendorFromPlaceInput): Promise<VendorDto> {
    return notImplemented("API_DESIGN §61 (Phase 4: Financial & Vendors)");
  },

  /** API §62. */
  async get(ctx: MemberContext, vendorId: string): Promise<VendorDto> {
    return notImplemented("API_DESIGN §62 (Phase 4: Financial & Vendors)");
  },

  /** API §63. */
  async update(ctx: MemberContext, vendorId: string, input: UpdateVendorInput): Promise<VendorDto> {
    return notImplemented("API_DESIGN §63 (Phase 4: Financial & Vendors)");
  },

  /** Sets archivedAt. API §64. */
  async archive(ctx: MemberContext, vendorId: string): Promise<void> {
    return notImplemented("API_DESIGN §64 (Phase 4: Financial & Vendors)");
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /** Expenses: a referenced vendor must belong to this wedding (DATABASE_DESIGN §57). */
  async assertVendorInWedding(weddingId: string, vendorId: string): Promise<void> {
    return notImplemented("DATABASE_DESIGN §57 (Phase 4: Financial & Vendors)");
  },

  /** Dashboard "Vendors: 8". */
  async countForDashboard(weddingId: string): Promise<number> {
    return notImplemented("DATABASE_DESIGN §88 (Phase 1: Foundation — dashboard)");
  },
};
