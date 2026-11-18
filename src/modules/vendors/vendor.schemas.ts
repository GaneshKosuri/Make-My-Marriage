/**
 * Vendor and discovery request schemas (Zod, `.strict()`). Isomorphic: the
 * vendor form reuses them. A client-supplied `weddingId`, `source`,
 * `googlePlaceId` or `archivedAt` is never accepted (API_DESIGN §60, §63).
 */
import { z } from "zod";

import { objectId } from "@/lib/object-id";
import { pageQuerySchema } from "@/lib/pagination";
import { queryFlag } from "@/lib/query";

import {
  VENDOR_ADDRESS_MAX_LENGTH,
  VENDOR_AGREED_COST_MAX_PAISE,
  VENDOR_CATEGORIES,
  VENDOR_CONTACT_MAX_LENGTH,
  VENDOR_EMAIL_MAX_LENGTH,
  VENDOR_MAX_EVENTS,
  VENDOR_NAME_MAX_LENGTH,
  VENDOR_NOTES_MAX_LENGTH,
  VENDOR_PHONE_MAX_LENGTH,
  VENDOR_PHONE_PATTERN,
  VENDOR_SEARCH_MAX_LENGTH,
  VENDOR_WEBSITE_MAX_LENGTH,
} from "./vendor.constants";

export const vendorIdParams = z.object({ vendorId: objectId }).strict();

const name = z
  .string()
  .trim()
  .min(1, "Enter the vendor's name")
  .max(VENDOR_NAME_MAX_LENGTH, "Keep the name under 120 characters");

const category = z.enum(VENDOR_CATEGORIES, "Choose a category");

/** Optional text: blank (or null) means "not set" and clears it on update. */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).nullable().optional();

const contactPerson = optionalText(VENDOR_CONTACT_MAX_LENGTH, "Keep the name under 120 characters");
const address = optionalText(VENDOR_ADDRESS_MAX_LENGTH, "Keep the address under 500 characters");
const notes = optionalText(VENDOR_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters");

const phone = z
  .string()
  .trim()
  .max(VENDOR_PHONE_MAX_LENGTH, "Phone number is too long")
  .regex(VENDOR_PHONE_PATTERN, "Use digits and + ( ) - . only")
  .nullable()
  .optional();

const email = z
  .string()
  .trim()
  .max(VENDOR_EMAIL_MAX_LENGTH, "Email address is too long")
  .pipe(z.union([z.literal(""), z.email("Enter a valid email address")]))
  .nullable()
  .optional();

const WEBSITE_MESSAGE = "Enter a website like pixelphotography.in";

/**
 * "pixelphotography.in" or a full http(s) address. Stored with its scheme, so
 * the vendor page can link to it; any other scheme (javascript:, data:, …) is
 * refused, since the link is shown to every member.
 */
export function normaliseWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const website = z
  .string()
  .trim()
  .max(VENDOR_WEBSITE_MAX_LENGTH, "Website address is too long")
  .transform((value, ctx) => {
    const normalised = normaliseWebsite(value);
    if (normalised === null) {
      ctx.addIssue({ code: "custom", message: WEBSITE_MESSAGE });
      return z.NEVER;
    }
    return normalised;
  })
  .pipe(z.string().max(VENDOR_WEBSITE_MAX_LENGTH, "Website address is too long"))
  .nullable()
  .optional();

/** What was agreed in total, in integer paise; null clears it. Not a budget or a balance. */
const totalAgreedCostPaise = z
  .number("Enter the agreed cost")
  .int("Enter the agreed cost in paise")
  .min(0, "The agreed cost can't be negative")
  .max(VENDOR_AGREED_COST_MAX_PAISE, "That is more than ₹100 crore")
  .nullable()
  .optional();

/** Duplicates are dropped; `[]` links no events. */
const eventIds = z
  .array(objectId)
  .transform((ids) => [...new Set(ids)])
  .pipe(z.array(z.string()).max(VENDOR_MAX_EVENTS, "Choose at most 100 events"));

/** API_DESIGN §60. The source is always MANUAL here. */
export const createVendorSchema = z
  .object({
    name,
    category,
    contactPerson,
    phone,
    email,
    address,
    website,
    totalAgreedCostPaise,
    eventIds: eventIds.default([]),
    notes,
  })
  .strict();

/**
 * API_DESIGN §63: at least one field. `version` is the one last read: when it
 * is stale the update is refused with CONFLICT (decided 2026-11-13, as for
 * events, tasks and guests).
 */
export const updateVendorSchema = z
  .object({
    name: name.optional(),
    category: category.optional(),
    contactPerson,
    phone,
    email,
    address,
    website,
    totalAgreedCostPaise,
    eventIds: eventIds.optional(),
    notes,
    version: z.number("Reload the vendor and try again").int().min(0).optional(),
  })
  .strict()
  .refine(
    (input) => Object.keys(input).some((key) => key !== "version"),
    "Send at least one field to change",
  );

/**
 * API_DESIGN §59: page + filters that combine with AND. `search` matches the
 * name or contact person literally (API_DESIGN §93); blank means no search.
 * Archived vendors are left out unless `includeArchived=true`.
 */
export const listVendorsQuerySchema = pageQuerySchema
  .extend({
    category: category.optional(),
    search: z
      .string()
      .trim()
      .max(VENDOR_SEARCH_MAX_LENGTH, "Search is too long")
      .transform((value) => value || undefined)
      .optional(),
    includeArchived: queryFlag.optional(),
  })
  .strict();

/*
 * TODO(Phase 4 slice 5: vendor discovery) — define with `.strict()`:
 *   - addVendorFromPlaceSchema   API_DESIGN §61  { googlePlaceId } only — details are fetched server-side
 *   - discoverySearchQuerySchema API_DESIGN §65  category, query?, near? (default: wedding city)
 */
