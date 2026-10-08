import "server-only";

import type { PageQuery } from "@/lib/pagination";
import { notImplemented } from "@/server/errors";

import type { VendorCategory } from "./vendor.constants";
import type { VendorDoc, VendorRecord } from "./vendor.model";

export interface VendorListFilter {
  category?: VendorCategory;
  /** Name / contact person (API_DESIGN §93). */
  search?: string;
  includeArchived: boolean;
}

/** Data access for `vendors`. `weddingId` is ALWAYS the first argument. */
export const vendorRepository = {
  async list(
    weddingId: string,
    filter: VendorListFilter,
    page: PageQuery,
  ): Promise<{ items: VendorRecord[]; total: number }> {
    return notImplemented("API_DESIGN §59 (Phase 4: Financial & Vendors)");
  },

  async findById(weddingId: string, vendorId: string): Promise<VendorRecord | null> {
    return notImplemented("API_DESIGN §62 (Phase 4: Financial & Vendors)");
  },

  async findActiveByIds(weddingId: string, vendorIds: readonly string[]): Promise<VendorRecord[]> {
    return notImplemented("DATABASE_DESIGN §57 (Phase 4: Financial & Vendors)");
  },

  async create(
    weddingId: string,
    input: Omit<VendorDoc, "weddingId" | "archivedAt" | "createdAt" | "updatedAt">,
  ): Promise<VendorRecord> {
    return notImplemented("API_DESIGN §60–61 (Phase 4: Financial & Vendors)");
  },

  async update(
    weddingId: string,
    vendorId: string,
    changes: Partial<VendorDoc>,
  ): Promise<VendorRecord | null> {
    return notImplemented("API_DESIGN §63 (Phase 4: Financial & Vendors)");
  },

  async archive(weddingId: string, vendorId: string, at: Date): Promise<boolean> {
    return notImplemented("API_DESIGN §64 (Phase 4: Financial & Vendors)");
  },

  async countActive(weddingId: string): Promise<number> {
    return notImplemented("DATABASE_DESIGN §88 (Phase 1: Foundation — dashboard)");
  },
};
