import "server-only";

import type { PageResult } from "@/lib/pagination";
import type { MemberContext } from "@/server/auth";
import { isDuplicateKeyError } from "@/server/db/errors";
import { AppError } from "@/server/errors";
import { buildPagePagination } from "@/server/http/pagination";
import { logger } from "@/server/logging/logger";
import { getVendorDiscoveryService } from "@/server/places";
import { getRateLimiter, policies } from "@/server/security/rate-limit";

import { eventsService } from "@/modules/events";

import { toVendorDto, toVendorSummaryDto } from "./vendor.mapper";
import type { VendorRecord } from "./vendor.model";
import { vendorRepository, type VendorFields } from "./vendor.repository";
import type {
  AddVendorFromPlaceInput,
  CreateVendorInput,
  ListVendorsQuery,
  UpdateVendorInput,
  VendorDto,
  VendorSummaryDto,
} from "./vendor.types";

/** Field key the form shows event problems against. */
const EVENTS_FIELD = "eventIds";

const ARCHIVED = "This vendor is archived, so it can't be changed.";
const ALREADY_ADDED = "This place is already in My Vendors.";

/** Blank optional text is stored as null ("not set"). */
const orNull = (value: string | null | undefined) => value || null;

/** Why a versioned update matched nothing: gone, archived, or changed by someone else. */
function updateRefused(vendor: VendorRecord | null): AppError {
  if (!vendor) return new AppError("NOT_FOUND");
  if (vendor.archivedAt) return new AppError("CONFLICT", ARCHIVED);
  return new AppError("CONFLICT");
}

/** My Vendors (PRD §9.16; SYSTEM_DESIGN §33, §36; API_DESIGN §59–64). Phase 4. */
export const vendorsService = {
  /** Active vendors by name; archived ones only with `includeArchived`. API §59. */
  async list(ctx: MemberContext, query: ListVendorsQuery): Promise<PageResult<VendorDto>> {
    const page = { page: query.page, limit: query.limit };
    const { items, total } = await vendorRepository.list(
      ctx.weddingId,
      {
        category: query.category,
        search: query.search,
        includeArchived: query.includeArchived ?? false,
      },
      page,
    );
    return {
      items: await toVendorDtos(ctx.weddingId, items),
      pagination: buildPagePagination(total, page),
    };
  },

  /** Linked events must be active events of this wedding. source = MANUAL. API §60. */
  async create(ctx: MemberContext, input: CreateVendorInput): Promise<VendorDto> {
    if (input.eventIds.length > 0) {
      await eventsService.assertActiveEventsInWedding(ctx.weddingId, input.eventIds, EVENTS_FIELD);
    }
    const vendor = await vendorRepository.create(ctx.weddingId, {
      ...vendorFields(input),
      source: "MANUAL",
      googlePlaceId: null,
    });
    logger.info("Vendor created", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      vendorId: vendor._id.toString(),
    });
    return toSingleDto(ctx.weddingId, vendor);
  },

  /**
   * A vendor found on Google, saved from the add form the family reviewed
   * (decided 2026-11-18). The place is checked with Google server-side; a place
   * Google no longer lists is refused. source = GOOGLE_PLACES, and only the
   * place id is kept as Google's. A place already in My Vendors is CONFLICT;
   * an archived one is restored with the reviewed details (QA D1). Only a
   * request that reaches Google counts against the place-details limit. API §61.
   */
  async createFromPlace(ctx: MemberContext, input: AddVendorFromPlaceInput): Promise<VendorDto> {
    const [existing] = await vendorRepository.findByPlaceIds(ctx.weddingId, [input.googlePlaceId]);
    if (existing && !existing.archivedAt) throw new AppError("CONFLICT", ALREADY_ADDED);
    if (input.eventIds.length > 0) {
      await eventsService.assertActiveEventsInWedding(ctx.weddingId, input.eventIds, EVENTS_FIELD);
    }
    await getRateLimiter().enforce([
      { policy: policies.vendorDiscoveryPlace, subject: ctx.weddingId },
    ]);
    try {
      await getVendorDiscoveryService().getPlaceDetails(input.googlePlaceId);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") {
        throw new AppError("VALIDATION_ERROR", undefined, {
          details: { googlePlaceId: "Google no longer lists this place. Add it by hand instead." },
        });
      }
      throw error;
    }

    if (existing) {
      const restored = await vendorRepository.restoreFromPlace(
        ctx.weddingId,
        existing._id.toString(),
        vendorFields(input),
      );
      // Someone else restored it a moment ago.
      if (!restored) throw new AppError("CONFLICT", ALREADY_ADDED);
      logger.info("Archived vendor restored from Google", {
        requestId: ctx.requestId,
        weddingId: ctx.weddingId,
        vendorId: restored._id.toString(),
      });
      return toSingleDto(ctx.weddingId, restored);
    }

    let vendor: VendorRecord;
    try {
      vendor = await vendorRepository.create(ctx.weddingId, {
        ...vendorFields(input),
        source: "GOOGLE_PLACES",
        googlePlaceId: input.googlePlaceId,
      });
    } catch (error) {
      // Two members adding the same place at once: the unique index decides.
      if (isDuplicateKeyError(error)) throw new AppError("CONFLICT", ALREADY_ADDED);
      throw error;
    }
    logger.info("Vendor added from Google", {
      requestId: ctx.requestId,
      weddingId: ctx.weddingId,
      vendorId: vendor._id.toString(),
    });
    return toSingleDto(ctx.weddingId, vendor);
  },

  /** `_id + weddingId`; cross-wedding → NOT_FOUND. Archived vendors stay readable. API §62. */
  async get(ctx: MemberContext, vendorId: string): Promise<VendorDto> {
    const vendor = await vendorRepository.findById(ctx.weddingId, vendorId);
    if (!vendor) throw new AppError("NOT_FOUND");
    return toSingleDto(ctx.weddingId, vendor);
  },

  /**
   * Partial. Events the vendor gains must be active; events it already has may
   * stay even if archived. An archived vendor can't be changed. A stale
   * `version`, or another write between our read and update, is CONFLICT.
   * Source and Google place never change. API §63.
   */
  async update(ctx: MemberContext, vendorId: string, input: UpdateVendorInput): Promise<VendorDto> {
    const current = await vendorRepository.findById(ctx.weddingId, vendorId);
    if (!current || current.archivedAt) throw updateRefused(current);
    if (input.version !== undefined && input.version !== current.__v) {
      throw new AppError("CONFLICT");
    }
    if (input.eventIds !== undefined) {
      const existing = new Set(current.eventIds.map((id) => id.toString()));
      const added = input.eventIds.filter((id) => !existing.has(id));
      if (added.length > 0) {
        await eventsService.assertActiveEventsInWedding(ctx.weddingId, added, EVENTS_FIELD);
      }
    }

    const changes: Partial<VendorFields> = {};
    if (input.name !== undefined) changes.name = input.name;
    if (input.category !== undefined) changes.category = input.category;
    if (input.contactPerson !== undefined) changes.contactPerson = orNull(input.contactPerson);
    if (input.phone !== undefined) changes.phone = orNull(input.phone);
    if (input.email !== undefined) changes.email = orNull(input.email);
    if (input.address !== undefined) changes.address = orNull(input.address);
    if (input.website !== undefined) changes.website = orNull(input.website);
    if (input.totalAgreedCostPaise !== undefined) {
      changes.totalAgreedCostPaise = input.totalAgreedCostPaise;
    }
    if (input.eventIds !== undefined) changes.eventIds = input.eventIds;
    if (input.notes !== undefined) changes.notes = orNull(input.notes);

    const updated = await vendorRepository.updateVersioned(
      ctx.weddingId,
      vendorId,
      current.__v,
      changes,
    );
    if (!updated) {
      throw updateRefused(await vendorRepository.findById(ctx.weddingId, vendorId));
    }
    logger.info("Vendor updated", { requestId: ctx.requestId, weddingId: ctx.weddingId, vendorId });
    return toSingleDto(ctx.weddingId, updated);
  },

  /**
   * Sets archivedAt; never hard-deletes, because expenses keep pointing at the
   * vendor (DATABASE_DESIGN §54). Archiving again succeeds. API §64.
   */
  async archive(ctx: MemberContext, vendorId: string): Promise<void> {
    if (await vendorRepository.archive(ctx.weddingId, vendorId, new Date())) {
      logger.info("Vendor archived", {
        requestId: ctx.requestId,
        weddingId: ctx.weddingId,
        vendorId,
      });
      return;
    }
    if (!(await vendorRepository.findById(ctx.weddingId, vendorId))) {
      throw new AppError("NOT_FOUND");
    }
  },

  // ── Cross-module operations ─────────────────────────────────────────────

  /**
   * Expenses: a newly linked vendor must be an active vendor of this wedding
   * (DATABASE_DESIGN §57). Unknown, archived and other weddings' vendors look
   * the same.
   */
  async assertActiveVendorInWedding(
    weddingId: string,
    vendorId: string,
    field = "vendorId",
  ): Promise<void> {
    const [vendor] = await vendorRepository.findByIds(weddingId, [vendorId]);
    if (!vendor || vendor.archivedAt) {
      throw new AppError("VALIDATION_ERROR", undefined, {
        details: { [field]: "Choose a vendor of this wedding that is not archived" },
      });
    }
  },

  /** Summaries for embedding in other DTOs (expenses), archived vendors included. */
  async findSummaries(
    weddingId: string,
    vendorIds: readonly string[],
  ): Promise<Map<string, VendorSummaryDto>> {
    const vendors = await vendorRepository.findByIds(weddingId, [...new Set(vendorIds)]);
    return new Map(vendors.map((vendor) => [vendor._id.toString(), toVendorSummaryDto(vendor)]));
  },

  /** Dashboard "Vendors: 8". */
  async countForDashboard(weddingId: string): Promise<number> {
    return vendorRepository.countActive(weddingId);
  },
};

/** Form input → stored fields: blank optional text is null. */
function vendorFields(input: CreateVendorInput): VendorFields {
  return {
    name: input.name,
    category: input.category,
    contactPerson: orNull(input.contactPerson),
    phone: orNull(input.phone),
    email: orNull(input.email),
    address: orNull(input.address),
    website: orNull(input.website),
    totalAgreedCostPaise: input.totalAgreedCostPaise ?? null,
    eventIds: input.eventIds,
    notes: orNull(input.notes),
  };
}

/** Resolves linked-event summaries (archived ones included) in one batched lookup. */
async function toVendorDtos(
  weddingId: string,
  vendors: readonly VendorRecord[],
): Promise<VendorDto[]> {
  if (vendors.length === 0) return [];
  const eventIds = vendors.flatMap((vendor) => vendor.eventIds.map((id) => id.toString()));
  const events =
    eventIds.length > 0 ? await eventsService.findSummaries(weddingId, eventIds) : new Map();
  return vendors.map((vendor) => toVendorDto(vendor, events));
}

async function toSingleDto(weddingId: string, vendor: VendorRecord): Promise<VendorDto> {
  const [dto] = await toVendorDtos(weddingId, [vendor]);
  return dto!;
}
