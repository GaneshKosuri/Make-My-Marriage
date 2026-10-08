import { describe, expect, it } from "vitest";

import {
  createTokenHasher,
  generateToken,
  hashToken,
  isWellFormedToken,
  safeEqual,
  TOKEN_LENGTH,
  TOKEN_PATTERN,
  TOKEN_PURPOSES,
} from "./tokens";

describe("generateToken", () => {
  it("returns 32 random bytes as 43 base64url characters", () => {
    const token = generateToken();
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(token).toMatch(TOKEN_PATTERN);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("does not repeat", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateToken()));
    expect(tokens.size).toBe(500);
  });

  it("recognises well-formed tokens only", () => {
    expect(isWellFormedToken(generateToken())).toBe(true);
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
    expect(isWellFormedToken(`${generateToken()}x`)).toBe(false);
  });
});

describe("HMAC token hashing", () => {
  const hash = createTokenHasher("a".repeat(32));
  const raw = generateToken();

  it("is deterministic and never returns the raw token", () => {
    expect(hash("session", raw)).toBe(hash("session", raw));
    expect(hash("session", raw)).not.toContain(raw);
    expect(hash("session", raw)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("separates purposes: a hash for one use is useless for another", () => {
    const hashes = TOKEN_PURPOSES.map((purpose) => hash(purpose, raw));
    expect(new Set(hashes).size).toBe(TOKEN_PURPOSES.length);
  });

  it("depends on the secret", () => {
    const other = createTokenHasher("b".repeat(32));
    expect(other("session", raw)).not.toBe(hash("session", raw));
  });

  it("refuses short secrets", () => {
    expect(() => createTokenHasher("too-short")).toThrow();
  });

  it("hashToken uses SESSION_SECRET from the environment", () => {
    expect(hashToken("session", raw)).toBe(
      createTokenHasher(process.env.SESSION_SECRET ?? "")("session", raw),
    );
  });
});

describe("safeEqual", () => {
  it("compares strings of any length", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
    expect(safeEqual("secret", "secreT")).toBe(false);
    expect(safeEqual("secret", "secret-but-longer")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
