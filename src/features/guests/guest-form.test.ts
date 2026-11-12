import { describe, expect, it } from "vitest";

import type { GuestDto } from "@/modules/guests/guest.types";

import {
  emptyGuestForm,
  guestFormSchema,
  guestToForm,
  toCreateGuestBody,
  toUpdateGuestBody,
} from "./guest-form";
import { readGuestsUrl } from "./url-state";

const HALDI = "6aeb2fe70d805e865a620a01";
const WEDDING = "6aeb2fe70d805e865a620a02";

const guest: GuestDto = {
  id: "6aeb2fe70d805e865a620aa1",
  name: "Rajesh Sharma",
  email: "raj@example.com",
  phone: null,
  maxGuests: 4,
  invitedEvents: [
    { id: HALDI, name: "Haldi", startsAt: "2027-02-13T03:30:00.000Z", archivedAt: null },
    { id: WEDDING, name: "Wedding", startsAt: "2027-02-14T14:30:00.000Z", archivedAt: null },
  ],
  notes: null,
  rsvpStatus: "PENDING",
  attendingCount: null,
  rsvpUpdatedAt: null,
  invitationSentAt: null,
  lastReminderSentAt: null,
  reminderCount: 0,
  version: 3,
  createdAt: "2026-11-12T00:00:00.000Z",
  updatedAt: "2026-11-12T00:00:00.000Z",
};

describe("guest form", () => {
  it("starts with a party of one and no events", () => {
    expect(emptyGuestForm()).toEqual({
      name: "",
      email: "",
      phone: "",
      maxGuests: 1,
      invitedEventIds: [],
      notes: "",
    });
  });

  it("sends blank contacts and notes as not set", () => {
    const values = guestFormSchema.parse({ ...emptyGuestForm(), name: " Meera ", phone: " " });
    expect(toCreateGuestBody(values)).toEqual({
      name: "Meera",
      email: null,
      phone: null,
      maxGuests: 1,
      invitedEventIds: [],
      notes: null,
    });
  });

  it.each([
    [{ name: "" }, "name"],
    [{ email: "raj@" }, "email"],
    [{ phone: "call me" }, "phone"],
    [{ maxGuests: 0 }, "maxGuests"],
    [{ maxGuests: Number.NaN }, "maxGuests"],
  ])("rejects %o", (change, field) => {
    const result = guestFormSchema.safeParse({ ...guestToForm(guest), ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it("updates only what changed, with the version it was read at", () => {
    const initial = guestToForm(guest);
    const values = guestFormSchema.parse({ ...initial, maxGuests: 5, email: "" });
    expect(toUpdateGuestBody(values, initial, guest.version)).toEqual({
      maxGuests: 5,
      email: null,
      version: 3,
    });
  });

  it("sends nothing when the events are the same in another order", () => {
    const initial = guestToForm(guest);
    const values = guestFormSchema.parse({ ...initial, invitedEventIds: [WEDDING, HALDI] });
    expect(toUpdateGuestBody(values, initial, guest.version)).toBeNull();
  });

  it("sends the new event list when one is removed", () => {
    const initial = guestToForm(guest);
    const values = guestFormSchema.parse({ ...initial, invitedEventIds: [WEDDING] });
    expect(toUpdateGuestBody(values, initial, guest.version)).toEqual({
      invitedEventIds: [WEDDING],
      version: 3,
    });
  });
});

describe("guest list address", () => {
  it("reads search, filters and ?new=1, dropping anything unexpected", () => {
    expect(
      readGuestsUrl({
        search: "  sharma ",
        rsvpStatus: "PENDING",
        eventId: HALDI,
        invitationSent: "false",
        new: "1",
      }),
    ).toEqual({
      filters: { search: "sharma", rsvpStatus: "PENDING", eventId: HALDI, invitationSent: "false" },
      startAdding: true,
    });
    expect(
      readGuestsUrl({ search: " ", rsvpStatus: "MAYBE", eventId: "abc", invitationSent: "yes" }),
    ).toEqual({ filters: {}, startAdding: false });
  });
});
