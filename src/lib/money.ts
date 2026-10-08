/**
 * Money helpers. All monetary values are stored and transported as integer
 * paise (DATABASE_DESIGN §50): ₹1,234.50 = 123450 paise. Never do arithmetic
 * on floating-point rupees.
 */

export const PAISE_PER_RUPEE = 100;

const RUPEE_INPUT_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

export function isValidPaise(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function assertPaise(paise: number): void {
  if (!isValidPaise(paise)) {
    throw new RangeError(`Expected an integer number of paise, got ${String(paise)}`);
  }
}

/** 124500000 → 1245000 (rupees). For display/forms only; never store the result. */
export function paiseToRupees(paise: number): number {
  assertPaise(paise);
  return paise / PAISE_PER_RUPEE;
}

/**
 * Converts a rupee amount to integer paise without floating-point drift.
 * Accepts numbers (at most 2 decimals) or strings like "12,45,000.50" / "₹1,234.5".
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === "number") {
    if (!Number.isFinite(rupees)) throw new RangeError("Amount must be a finite number");
    const scaled = rupees * PAISE_PER_RUPEE;
    const rounded = Math.round(scaled);
    // 0.29 * 100 === 28.999999999999996: tolerate float noise, reject a third decimal.
    if (Math.abs(scaled - rounded) > 1e-6) {
      throw new RangeError("Amount must have at most 2 decimal places");
    }
    if (!Number.isSafeInteger(rounded)) throw new RangeError("Amount is too large");
    return rounded === 0 ? 0 : rounded; // normalise -0
  }

  const cleaned = rupees.replace(/[₹,\s]/g, "");
  const match = RUPEE_INPUT_PATTERN.exec(cleaned);
  if (!match) throw new RangeError(`Invalid rupee amount: "${rupees}"`);

  const [, sign, whole = "0", fraction = ""] = match;
  const paise = Number(whole) * PAISE_PER_RUPEE + Number(fraction.padEnd(2, "0"));
  const result = sign ? -paise : paise;
  if (!Number.isSafeInteger(result)) throw new RangeError("Amount is too large");
  return result === 0 ? 0 : result; // normalise -0
}

const formatters = new Map<number, Intl.NumberFormat>();

function inrFormatter(fractionDigits: 0 | 2): Intl.NumberFormat {
  let formatter = formatters.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(fractionDigits, formatter);
  }
  return formatter;
}

/**
 * Formats paise as Indian rupees with lakh/crore digit grouping.
 * 124500000 → "₹12,45,000"; 123450 → "₹1,234.50". Paise are shown only when non-zero.
 */
export function formatINR(paise: number): string {
  assertPaise(paise);
  const fractionDigits = paise % PAISE_PER_RUPEE === 0 ? 0 : 2;
  return inrFormatter(fractionDigits).format(paise / PAISE_PER_RUPEE);
}
