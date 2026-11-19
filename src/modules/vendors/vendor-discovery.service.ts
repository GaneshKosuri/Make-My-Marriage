import "server-only";

import type { MemberContext } from "@/server/auth";
import { AppError } from "@/server/errors";
import { getVendorDiscoveryService, type PlaceDetails } from "@/server/places";

import { weddingsService } from "@/modules/weddings";

import {
  VENDOR_ADDRESS_MAX_LENGTH,
  VENDOR_DISCOVERY_KEYWORDS,
  VENDOR_DISCOVERY_MAX_RESULTS,
  VENDOR_NAME_MAX_LENGTH,
  VENDOR_PHONE_MAX_LENGTH,
  VENDOR_PHONE_PATTERN,
  VENDOR_WEBSITE_MAX_LENGTH,
} from "./vendor.constants";
import { vendorRepository } from "./vendor.repository";
import { normaliseWebsite } from "./vendor.schemas";
import type {
  DiscoveredPlaceDetailsDto,
  DiscoveredVendorDto,
  MyVendorRef,
  VendorDiscoveryQuery,
} from "./vendor.types";

const NEAR_REQUIRED = "Enter a town or city to search near";

/** "Dehradun, Uttarakhand", or null when the wedding has neither. */
function weddingPlace(city: string | null, state: string | null): string | null {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** The wedding's vendors for these places, by place id. */
async function myVendorsByPlace(
  weddingId: string,
  googlePlaceIds: readonly string[],
): Promise<Map<string, MyVendorRef>> {
  const vendors = await vendorRepository.findByPlaceIds(weddingId, googlePlaceIds);
  return new Map(
    vendors.map((vendor) => [
      vendor.googlePlaceId!,
      { id: vendor._id.toString(), archived: vendor.archivedAt !== null },
    ]),
  );
}

/** Google's text, cut to what the vendor form accepts (the family can edit it). */
const clip = (value: string | null, max: number) => (value ? value.slice(0, max).trim() : null);

/** Google's phone and website only when the vendor form would accept them as they are. */
function formReady(details: PlaceDetails): Pick<DiscoveredPlaceDetailsDto, "phone" | "website"> {
  const phone =
    details.phone &&
    details.phone.length <= VENDOR_PHONE_MAX_LENGTH &&
    VENDOR_PHONE_PATTERN.test(details.phone)
      ? details.phone
      : null;
  const website = details.website ? normaliseWebsite(details.website) : null;
  return {
    phone,
    website: website && website.length <= VENDOR_WEBSITE_MAX_LENGTH ? website : null,
  };
}

/**
 * Vendor discovery orchestration (PRD §9.17; SYSTEM_DESIGN §34, §84; API_DESIGN §65–66). Phase 4.
 * Searches by place name, defaulting to the wedding's city (decided 2026-11-18);
 * category → VENDOR_DISCOVERY_KEYWORDS; provider calls go through
 * getVendorDiscoveryService() (never the Google API directly). Provider
 * failures surface as EXTERNAL_SERVICE_ERROR without breaking the rest of the app.
 * Nothing Google returns is stored here (only the place id, when a vendor is saved).
 */
export const vendorDiscoveryService = {
  async search(ctx: MemberContext, query: VendorDiscoveryQuery): Promise<DiscoveredVendorDto[]> {
    let near = query.near;
    if (!near) {
      const wedding = await weddingsService.findIdentityWedding(ctx.weddingId);
      near = wedding ? (weddingPlace(wedding.city, wedding.state) ?? undefined) : undefined;
    }
    if (!near) {
      throw new AppError("VALIDATION_ERROR", undefined, { details: { near: NEAR_REQUIRED } });
    }

    const places = await getVendorDiscoveryService().search({
      keyword: VENDOR_DISCOVERY_KEYWORDS[query.category],
      near,
      query: query.query,
      maxResults: VENDOR_DISCOVERY_MAX_RESULTS,
    });
    const mine = await myVendorsByPlace(
      ctx.weddingId,
      places.map((place) => place.googlePlaceId),
    );
    return places.map((place) => ({
      ...place,
      myVendor: mine.get(place.googlePlaceId) ?? null,
    }));
  },

  /**
   * One place's details to pre-fill the add form: name and address cut to the
   * form's limits, phone and website only when the form would accept them.
   * Unknown places → NOT_FOUND.
   */
  async getPlace(ctx: MemberContext, googlePlaceId: string): Promise<DiscoveredPlaceDetailsDto> {
    const details = await getVendorDiscoveryService().getPlaceDetails(googlePlaceId);
    const mine = await myVendorsByPlace(ctx.weddingId, [details.googlePlaceId]);
    return {
      googlePlaceId: details.googlePlaceId,
      name: clip(details.name, VENDOR_NAME_MAX_LENGTH) ?? details.name,
      rating: details.rating,
      ratingCount: details.ratingCount,
      address: clip(details.address, VENDOR_ADDRESS_MAX_LENGTH),
      ...formReady(details),
      myVendor: mine.get(details.googlePlaceId) ?? null,
    };
  },
};
