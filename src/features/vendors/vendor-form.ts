/**
 * The add/edit vendor form (PRD §9.16): name and category, optional contacts,
 * the agreed cost in rupees, the events the vendor works at and notes. Blank
 * optional fields mean "not set".
 */
import { z } from "zod";

import { formatRupeesInput, parseRupeesInput } from "@/lib/money";
import {
  VENDOR_ADDRESS_MAX_LENGTH,
  VENDOR_AGREED_COST_MAX_PAISE,
  VENDOR_CATEGORIES,
  VENDOR_CONTACT_MAX_LENGTH,
  VENDOR_EMAIL_MAX_LENGTH,
  VENDOR_NAME_MAX_LENGTH,
  VENDOR_NOTES_MAX_LENGTH,
  VENDOR_PHONE_MAX_LENGTH,
  VENDOR_PHONE_PATTERN,
  VENDOR_WEBSITE_MAX_LENGTH,
  type VendorCategory,
} from "@/modules/vendors/vendor.constants";
import {
  normaliseWebsite,
  type addVendorFromPlaceSchema,
  type createVendorSchema,
  type updateVendorSchema,
} from "@/modules/vendors/vendor.schemas";
import type { DiscoveredPlaceDetailsDto, VendorDto } from "@/modules/vendors/vendor.types";

import { VENDORS } from "./vendors-content";

const FIELDS = VENDORS.form.fields;

const text = (max: number, message: string) => z.string().trim().max(max, message);

export const vendorFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter the vendor's name")
      .max(VENDOR_NAME_MAX_LENGTH, "Keep the name under 120 characters"),
    // "" until one is chosen.
    category: z.union([z.literal(""), z.enum(VENDOR_CATEGORIES)]).refine(Boolean, {
      message: "Choose a category",
    }),
    contactPerson: text(VENDOR_CONTACT_MAX_LENGTH, "Keep the name under 120 characters"),
    phone: text(VENDOR_PHONE_MAX_LENGTH, "Phone number is too long").regex(
      VENDOR_PHONE_PATTERN,
      "Use digits and + ( ) - . only",
    ),
    email: text(VENDOR_EMAIL_MAX_LENGTH, "Email address is too long").pipe(
      z.union([z.literal(""), z.email("Enter a valid email address")]),
    ),
    website: text(VENDOR_WEBSITE_MAX_LENGTH, "Website address is too long").refine(
      (value) => normaliseWebsite(value) !== null,
      "Enter a website like pixelphotography.in",
    ),
    address: text(VENDOR_ADDRESS_MAX_LENGTH, "Keep the address under 500 characters"),
    agreedCost: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || parseRupeesInput(value) !== null,
        FIELDS.agreedCost.invalid,
      )
      .refine(
        (value) => (parseRupeesInput(value) ?? 0) <= VENDOR_AGREED_COST_MAX_PAISE,
        "That is more than ₹100 crore",
      ),
    eventIds: z.array(z.string()),
    notes: text(VENDOR_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters"),
  })
  .strict();

export type VendorFormValues = z.input<typeof vendorFormSchema>;
type ParsedVendorForm = z.output<typeof vendorFormSchema>;
export type CreateVendorBody = z.input<typeof createVendorSchema>;
export type UpdateVendorBody = z.input<typeof updateVendorSchema>;
export type AddVendorFromPlaceBody = z.input<typeof addVendorFromPlaceSchema>;

/** API field names for VALIDATION_ERROR details → the form's fields. */
export const VENDOR_SERVER_FIELDS = {
  name: "name",
  category: "category",
  contactPerson: "contactPerson",
  phone: "phone",
  email: "email",
  website: "website",
  address: "address",
  totalAgreedCostPaise: "agreedCost",
  eventIds: "eventIds",
  notes: "notes",
} as const satisfies Record<string, keyof VendorFormValues>;

export function emptyVendorForm(): VendorFormValues {
  return {
    name: "",
    category: "",
    contactPerson: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    agreedCost: "",
    eventIds: [],
    notes: "",
  };
}

/** The add form pre-filled from Google; the family reviews it before saving. */
export function placeToForm(
  place: DiscoveredPlaceDetailsDto,
  category: VendorCategory,
): VendorFormValues {
  return {
    ...emptyVendorForm(),
    name: place.name,
    category,
    phone: place.phone ?? "",
    website: place.website ?? "",
    address: place.address ?? "",
  };
}

export function vendorToForm(vendor: VendorDto): VendorFormValues {
  return {
    name: vendor.name,
    category: vendor.category,
    contactPerson: vendor.contactPerson ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    website: vendor.website ?? "",
    address: vendor.address ?? "",
    agreedCost:
      vendor.totalAgreedCostPaise === null ? "" : formatRupeesInput(vendor.totalAgreedCostPaise),
    eventIds: vendor.events.map((event) => event.id),
    notes: vendor.notes ?? "",
  };
}

const paiseOf = (agreedCost: string) => (agreedCost ? parseRupeesInput(agreedCost) : null);

/** POST /api/vendors body (API_DESIGN §60). */
export function toCreateVendorBody(values: ParsedVendorForm): CreateVendorBody {
  return {
    name: values.name,
    // The schema refused "" already.
    category: values.category as Exclude<ParsedVendorForm["category"], "">,
    contactPerson: values.contactPerson || null,
    phone: values.phone || null,
    email: values.email || null,
    website: values.website || null,
    address: values.address || null,
    totalAgreedCostPaise: paiseOf(values.agreedCost),
    eventIds: values.eventIds,
    notes: values.notes || null,
  };
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * PATCH /api/vendors/:id body (API_DESIGN §63): only what differs from the
 * values the form opened with, plus the version they were read at. Null when
 * nothing changed.
 */
export function toUpdateVendorBody(
  values: ParsedVendorForm,
  initial: VendorFormValues,
  version: number,
): UpdateVendorBody | null {
  const body: UpdateVendorBody = {};
  const changed = (key: Exclude<keyof VendorFormValues, "eventIds" | "category">) =>
    values[key] !== initial[key].trim();
  if (changed("name")) body.name = values.name;
  if (values.category !== initial.category && values.category) body.category = values.category;
  if (changed("contactPerson")) body.contactPerson = values.contactPerson || null;
  if (changed("phone")) body.phone = values.phone || null;
  if (changed("email")) body.email = values.email || null;
  if (changed("website")) body.website = values.website || null;
  if (changed("address")) body.address = values.address || null;
  if (paiseOf(values.agreedCost) !== paiseOf(initial.agreedCost.trim())) {
    body.totalAgreedCostPaise = paiseOf(values.agreedCost);
  }
  if (!sameIds(values.eventIds, initial.eventIds)) body.eventIds = values.eventIds;
  if (changed("notes")) body.notes = values.notes || null;
  return Object.keys(body).length > 0 ? { ...body, version } : null;
}
