import { describe, expect, it } from "vitest";

import { formatINR, isValidPaise, paiseToRupees, rupeesToPaise } from "./money";

describe("formatINR", () => {
  it("uses Indian digit grouping (lakh/crore)", () => {
    expect(formatINR(124_500_000)).toBe("₹12,45,000");
    expect(formatINR(174_250_000)).toBe("₹17,42,500");
    expect(formatINR(1_000_000_000)).toBe("₹1,00,00,000");
  });

  it("shows paise only when non-zero", () => {
    expect(formatINR(123_450)).toBe("₹1,234.50");
    expect(formatINR(123_457)).toBe("₹1,234.57");
    expect(formatINR(100)).toBe("₹1");
    expect(formatINR(0)).toBe("₹0");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatINR(1.5)).toThrow(RangeError);
    expect(() => formatINR(Number.NaN)).toThrow(RangeError);
  });
});

describe("paise ↔ rupees", () => {
  it("converts paise to rupees", () => {
    expect(paiseToRupees(124_500_000)).toBe(1_245_000);
    expect(paiseToRupees(123_450)).toBe(1234.5);
  });

  it("converts rupee numbers without floating-point drift", () => {
    expect(rupeesToPaise(1234.5)).toBe(123_450);
    expect(rupeesToPaise(0.29)).toBe(29); // 0.29 * 100 === 28.999999999999996
    expect(rupeesToPaise(1_245_000)).toBe(124_500_000);
    expect(rupeesToPaise(-12.3)).toBe(-1230);
  });

  it("parses rupee strings with grouping and symbols", () => {
    expect(rupeesToPaise("12,45,000")).toBe(124_500_000);
    expect(rupeesToPaise("₹1,234.5")).toBe(123_450);
    expect(rupeesToPaise(" 99.99 ")).toBe(9999);
    expect(rupeesToPaise("0")).toBe(0);
  });

  it("rejects more than two decimals and garbage", () => {
    expect(() => rupeesToPaise(1.234)).toThrow(RangeError);
    expect(() => rupeesToPaise("1.234")).toThrow(RangeError);
    expect(() => rupeesToPaise("abc")).toThrow(RangeError);
    expect(() => rupeesToPaise(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("round-trips", () => {
    for (const paise of [0, 1, 99, 100, 123_450, 124_500_000]) {
      expect(rupeesToPaise(paiseToRupees(paise))).toBe(paise);
    }
  });

  it("validates paise values", () => {
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(1.1)).toBe(false);
    expect(isValidPaise("100")).toBe(false);
  });
});
