import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import {
  eventCoverKey,
  galleryObjectKey,
  isKeyInWeddingNamespace,
  stagingKey,
  weddingCoverKey,
} from "./object-keys";

const weddingId = new Types.ObjectId().toString();
const otherWedding = new Types.ObjectId().toString();

describe("object keys (DATABASE_DESIGN §102)", () => {
  it("builds namespaced, random keys", () => {
    expect(galleryObjectKey(weddingId, "image/jpeg")).toMatch(
      new RegExp(`^weddings/${weddingId}/gallery/[a-f0-9]{32}\\.jpg$`),
    );
    expect(weddingCoverKey(weddingId, "image/png")).toMatch(/\/covers\/[a-f0-9]{32}\.png$/);
    expect(eventCoverKey(weddingId, otherWedding, "image/webp")).toMatch(
      new RegExp(`/events/${otherWedding}/[a-f0-9]{32}\\.webp$`),
    );
    expect(stagingKey(weddingId, "gallery", "image/jpeg")).toMatch(
      new RegExp(`^staging/weddings/${weddingId}/gallery/`),
    );
    expect(galleryObjectKey(weddingId, "image/jpeg")).not.toBe(
      galleryObjectKey(weddingId, "image/jpeg"),
    );
  });

  it("refuses ids that are not ObjectIds (no path injection)", () => {
    expect(() => galleryObjectKey("../../etc", "image/jpeg")).toThrow();
    expect(() => eventCoverKey(weddingId, "x/../y", "image/png")).toThrow();
  });

  it("checks that a key belongs to the wedding's namespace", () => {
    const key = galleryObjectKey(weddingId, "image/jpeg");
    expect(isKeyInWeddingNamespace(key, weddingId)).toBe(true);
    expect(isKeyInWeddingNamespace(stagingKey(weddingId, "gallery", "image/png"), weddingId)).toBe(
      true,
    );
    expect(isKeyInWeddingNamespace(key, otherWedding)).toBe(false);
    expect(
      isKeyInWeddingNamespace(`weddings/${weddingId}/../${otherWedding}/x.jpg`, weddingId),
    ).toBe(false);
  });
});
