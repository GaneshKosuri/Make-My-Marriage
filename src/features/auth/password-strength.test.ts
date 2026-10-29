import { describe, expect, it } from "vitest";

import { passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it.each([
    ["", 0],
    ["1234567", 0],
    ["abcdefgh", 1],
    ["abcdefgh1!", 2],
    ["abcdefghijkl", 2],
    ["Abcdefghij1!", 3],
    ["correct horse battery", 3],
  ] as const)("%j → %i", (password, expected) => {
    expect(passwordStrength(password)).toBe(expected);
  });
});
