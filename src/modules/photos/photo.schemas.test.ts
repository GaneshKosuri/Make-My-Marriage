import { describe, expect, it } from "vitest";

import {
  confirmPhotoUploadSchema,
  listPhotosQuerySchema,
  photoUploadRequestSchema,
} from "./photo.schemas";

const photo = { filename: "IMG_1001.jpg", mimeType: "image/jpeg", sizeBytes: 5_283_912 };

describe("photoUploadRequestSchema", () => {
  it("takes a JPEG, PNG or WebP up to 10 MB, with an optional event and preview", () => {
    expect(photoUploadRequestSchema.parse(photo)).toEqual(photo);
    expect(
      photoUploadRequestSchema.safeParse({
        ...photo,
        mimeType: "image/webp",
        eventId: "6aeb2fe70d805e865a620a01",
        preview: { mimeType: "image/webp", sizeBytes: 60_000 },
      }).success,
    ).toBe(true);
    expect(photoUploadRequestSchema.safeParse({ ...photo, eventId: null }).success).toBe(true);
  });

  it.each([
    ["HEIC", { mimeType: "image/heic" }],
    ["SVG", { mimeType: "image/svg+xml" }],
    ["over 10 MB", { sizeBytes: 10 * 1024 * 1024 + 1 }],
    ["empty", { sizeBytes: 0 }],
    ["a path", { filename: "photos/IMG.jpg" }],
    ["a blank name", { filename: "  " }],
    ["a big preview", { preview: { mimeType: "image/webp", sizeBytes: 513 * 1024 } }],
    ["a PNG preview", { preview: { mimeType: "image/png", sizeBytes: 100 } }],
    ["a weddingId", { weddingId: "6aeb2fe70d805e865a620a01" }],
  ])("refuses %s", (_label, change) => {
    expect(photoUploadRequestSchema.safeParse({ ...photo, ...change }).success).toBe(false);
  });
});

describe("confirmPhotoUploadSchema", () => {
  it("is the documented body: the key plus the photo's details, nothing else", () => {
    const body = { ...photo, objectKey: "staging/weddings/x/gallery/y.jpg" };
    expect(confirmPhotoUploadSchema.safeParse(body).success).toBe(true);
    expect(confirmPhotoUploadSchema.safeParse({ ...body, uploaderType: "GUEST" }).success).toBe(
      false,
    );
  });
});

describe("listPhotosQuerySchema", () => {
  it("takes an event id or 'other', 24 per page by default, at most 48", () => {
    expect(listPhotosQuerySchema.parse({})).toEqual({ limit: 24 });
    expect(listPhotosQuerySchema.parse({ eventId: "other", limit: "48" })).toEqual({
      eventId: "other",
      limit: 48,
    });
    expect(listPhotosQuerySchema.safeParse({ eventId: "mehendi" }).success).toBe(false);
    expect(listPhotosQuerySchema.safeParse({ limit: "49" }).success).toBe(false);
  });
});
