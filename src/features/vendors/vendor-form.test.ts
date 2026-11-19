import { describe, expect, it } from "vitest";

import type { VendorDto } from "@/modules/vendors/vendor.types";

import { toUpdateVendorBody, vendorFormSchema, vendorToForm } from "./vendor-form";

const pixel: VendorDto = {
  id: "6aeb2fe70d805e865a620ab1",
  name: "Pixel Photography",
  category: "PHOTOGRAPHER",
  contactPerson: "Rohit",
  phone: null,
  email: null,
  address: null,
  website: "https://pixelphotography.in/",
  totalAgreedCostPaise: 20_000_000,
  events: [],
  notes: null,
  source: "MANUAL",
  googlePlaceId: null,
  archivedAt: null,
  version: 3,
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
};

const submit = (changes: Partial<ReturnType<typeof vendorToForm>>) => {
  const initial = vendorToForm(pixel);
  return toUpdateVendorBody(vendorFormSchema.parse({ ...initial, ...changes }), initial, 3);
};

describe("toUpdateVendorBody", () => {
  it("sends nothing when nothing changed, even if the amount is retyped the same", () => {
    expect(submit({})).toBeNull();
    expect(submit({ agreedCost: "200000" })).toBeNull();
  });

  it("clears the agreed cost and contact with null, with the version", () => {
    expect(submit({ agreedCost: "", contactPerson: "  " })).toEqual({
      totalAgreedCostPaise: null,
      contactPerson: null,
      version: 3,
    });
  });
});
