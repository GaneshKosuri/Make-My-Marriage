/**
 * The add/edit guest form (PRD §9.7–9.8). One guest is one invitation: a name,
 * how many people it covers, optional contacts and the events it includes.
 * Blank email, phone and notes mean "not set".
 */
import { z } from "zod";

import {
  GUEST_DEFAULT_MAX_GUESTS,
  GUEST_EMAIL_MAX_LENGTH,
  GUEST_MAX_GUESTS_MAX,
  GUEST_MAX_GUESTS_MIN,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTES_MAX_LENGTH,
  GUEST_PHONE_MAX_LENGTH,
  GUEST_PHONE_PATTERN,
} from "@/modules/guests/guest.constants";
import type { createGuestSchema, updateGuestSchema } from "@/modules/guests/guest.schemas";
import type { GuestDto } from "@/modules/guests/guest.types";

export const guestFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter the guest's name")
      .max(GUEST_NAME_MAX_LENGTH, "Keep the name under 120 characters"),
    email: z
      .string()
      .trim()
      .max(GUEST_EMAIL_MAX_LENGTH, "Email address is too long")
      .pipe(z.union([z.literal(""), z.email("Enter a valid email address")])),
    phone: z
      .string()
      .trim()
      .max(GUEST_PHONE_MAX_LENGTH, "Phone number is too long")
      .regex(GUEST_PHONE_PATTERN, "Use digits and + ( ) - . only"),
    maxGuests: z
      .number("Enter how many people are invited")
      .int("Enter a whole number")
      .min(GUEST_MAX_GUESTS_MIN, "At least 1 person")
      .max(GUEST_MAX_GUESTS_MAX, "That is more than 10,000 people"),
    invitedEventIds: z.array(z.string()),
    notes: z.string().trim().max(GUEST_NOTES_MAX_LENGTH, "Keep notes under 2,000 characters"),
  })
  .strict();

export type GuestFormValues = z.input<typeof guestFormSchema>;
type ParsedGuestForm = z.output<typeof guestFormSchema>;
export type CreateGuestBody = z.input<typeof createGuestSchema>;
export type UpdateGuestBody = z.input<typeof updateGuestSchema>;

/** The API's field names for VALIDATION_ERROR details are the form's own. */
export const GUEST_SERVER_FIELDS = [
  "name",
  "email",
  "phone",
  "maxGuests",
  "invitedEventIds",
  "notes",
] as const satisfies readonly (keyof GuestFormValues)[];

export function emptyGuestForm(): GuestFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    maxGuests: GUEST_DEFAULT_MAX_GUESTS,
    invitedEventIds: [],
    notes: "",
  };
}

export function guestToForm(guest: GuestDto): GuestFormValues {
  return {
    name: guest.name,
    email: guest.email ?? "",
    phone: guest.phone ?? "",
    maxGuests: guest.maxGuests,
    invitedEventIds: guest.invitedEvents.map((event) => event.id),
    notes: guest.notes ?? "",
  };
}

/** POST /api/guests body (API_DESIGN §40). */
export function toCreateGuestBody(values: ParsedGuestForm): CreateGuestBody {
  return {
    name: values.name,
    email: values.email || null,
    phone: values.phone || null,
    maxGuests: values.maxGuests,
    invitedEventIds: values.invitedEventIds,
    notes: values.notes || null,
  };
}

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * PATCH /api/guests/:id body (API_DESIGN §42): only what differs from the
 * values the form opened with, plus the version they were read at. Null when
 * nothing changed.
 */
export function toUpdateGuestBody(
  values: ParsedGuestForm,
  initial: GuestFormValues,
  version: number,
): UpdateGuestBody | null {
  const body: UpdateGuestBody = {};
  if (values.name !== initial.name.trim()) body.name = values.name;
  if (values.email !== initial.email.trim()) body.email = values.email || null;
  if (values.phone !== initial.phone.trim()) body.phone = values.phone || null;
  if (values.maxGuests !== initial.maxGuests) body.maxGuests = values.maxGuests;
  if (!sameIds(values.invitedEventIds, initial.invitedEventIds)) {
    body.invitedEventIds = values.invitedEventIds;
  }
  if (values.notes !== initial.notes.trim()) body.notes = values.notes || null;
  return Object.keys(body).length > 0 ? { ...body, version } : null;
}
