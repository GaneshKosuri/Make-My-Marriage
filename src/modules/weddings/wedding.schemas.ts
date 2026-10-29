/**
 * Wedding request schemas (Zod, `.strict()`). Isomorphic: the create-wedding
 * form reuses them. A client-supplied `weddingId` is never accepted.
 */
import { z } from "zod";

import { daysUntil, isValidDateOnly, isValidTimeZone } from "@/lib/dates";

import {
  COUPLE_NAME_MAX_LENGTH,
  DEFAULT_TIME_ZONE,
  FORMATTED_ADDRESS_MAX_LENGTH,
  GOOGLE_PLACE_ID_MAX_LENGTH,
  LOCATION_PART_MAX_LENGTH,
  WEDDING_DESCRIPTION_MAX_LENGTH,
  WEDDING_SLUG_MAX_LENGTH,
  WEDDING_SLUG_PATTERN,
  WEDDING_TITLE_MAX_LENGTH,
} from "./wedding.constants";

export const weddingSlug = z
  .string()
  .max(WEDDING_SLUG_MAX_LENGTH)
  .regex(WEDDING_SLUG_PATTERN, "Invalid wedding address");

/** `/api/public/weddings/[slug]`. Pair with `invalidParams: "not-found"`. */
export const weddingSlugParams = z.object({ slug: weddingSlug }).strict();

const coupleName = (message: string) =>
  z.string().trim().min(1, message).max(COUPLE_NAME_MAX_LENGTH, "Name is too long");

/** Optional free text: blank means "not set". */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

const locationPart = (message: string) => z.string().trim().max(LOCATION_PART_MAX_LENGTH, message);

/**
 * Where the wedding takes place. PRD §9.2 requires the city; the rest is
 * optional. Coordinates and Place ids are accepted for a future place picker.
 */
export const weddingLocationSchema = z
  .object({
    city: locationPart("City is too long").min(1, "Enter the city"),
    state: locationPart("State is too long").optional(),
    country: locationPart("Country is too long").optional(),
    formattedAddress: z.string().trim().max(FORMATTED_ADDRESS_MAX_LENGTH).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    googlePlaceId: z.string().trim().max(GOOGLE_PLACE_ID_MAX_LENGTH).optional(),
  })
  .strict();

const weddingDate = z
  .string()
  .min(1, "Choose the wedding date")
  // Blank is already reported by min(1); only judge what was entered.
  .refine((value) => value === "" || isValidDateOnly(value), "Choose a valid date");

/** API_DESIGN §17. The wedding date must be today or later in the wedding's time zone. */
export const createWeddingSchema = z
  .object({
    brideName: coupleName("Enter the bride's name"),
    groomName: coupleName("Enter the groom's name"),
    title: optionalText(WEDDING_TITLE_MAX_LENGTH, "Title is too long"),
    description: optionalText(WEDDING_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters"),
    weddingDate,
    timeZone: z
      .string()
      .refine(isValidTimeZone, "Choose a valid time zone")
      .default(DEFAULT_TIME_ZONE),
    location: weddingLocationSchema,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (
      isValidDateOnly(input.weddingDate) &&
      isValidTimeZone(input.timeZone) &&
      daysUntil(input.weddingDate, input.timeZone) < 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["weddingDate"],
        message: "Choose today or a later date",
      });
    }
  });

/**
 * API_DESIGN §19: any subset of the wedding details; the website address
 * (slug), cover image and settings of other sections are never accepted here.
 * Blank title or description clears it. Whether a changed date is today or
 * later depends on the wedding's stored time zone, so the service checks that.
 */
export const updateWeddingSchema = z
  .object({
    brideName: coupleName("Enter the bride's name").optional(),
    groomName: coupleName("Enter the groom's name").optional(),
    title: optionalText(WEDDING_TITLE_MAX_LENGTH, "Title is too long"),
    description: optionalText(WEDDING_DESCRIPTION_MAX_LENGTH, "Keep it under 2,000 characters"),
    weddingDate: weddingDate.optional(),
    timeZone: z.string().refine(isValidTimeZone, "Choose a valid time zone").optional(),
    location: weddingLocationSchema.optional(),
  })
  .strict();

/*
 * TODO — define with `.strict()`:
 *   Phase 5: Wedding Experience
 *     - updateWebsiteSettingsSchema API_DESIGN §68 { theme, welcomeMessage, isPublished }
 *     - updateLivestreamSchema      API_DESIGN §71–72 { youtubeUrl (YouTube formats only) | null, isEnabled }
 *     - coverUploadRequestSchema    API_DESIGN §83 { mimeType, sizeBytes }
 *   Phase 6: Memories
 *     - updateGallerySettingsSchema API_DESIGN §74 { isEnabled, guestUploadsEnabled }
 */
