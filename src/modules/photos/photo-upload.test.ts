import { describe, expect, it } from "vitest";

import { hasImageSignature } from "./photo-upload";

const bytes = (...values: (number | string)[]) =>
  Uint8Array.from(
    values.flatMap((value) =>
      typeof value === "string" ? [...value].map((char) => char.charCodeAt(0)) : [value],
    ),
  );

describe("hasImageSignature", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(hasImageSignature("image/jpeg", bytes(0xff, 0xd8, 0xff, 0xe1))).toBe(true);
    expect(hasImageSignature("image/png", bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))).toBe(
      true,
    );
    expect(hasImageSignature("image/webp", bytes("RIFF", 1, 2, 3, 4, "WEBPVP8 "))).toBe(true);
  });

  it("refuses a mismatch, a truncated file and other types", () => {
    expect(hasImageSignature("image/jpeg", bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe(false);
    expect(hasImageSignature("image/webp", bytes("RIFF", 1, 2, 3, 4, "AVI "))).toBe(false);
    expect(hasImageSignature("image/png", bytes(0x89, "PN"))).toBe(false);
    expect(hasImageSignature("image/svg+xml", bytes("<svg"))).toBe(false);
  });
});
