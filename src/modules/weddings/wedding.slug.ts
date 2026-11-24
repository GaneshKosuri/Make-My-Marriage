import "server-only";

import { randomInt } from "node:crypto";

import { parseDateOnly } from "@/lib/dates";

import { WEDDING_SLUG_MAX_LENGTH } from "./wedding.constants";
import { weddingRepository } from "./wedding.repository";

/**
 * Website slug generation (SYSTEM_DESIGN §27, DATABASE_DESIGN §18):
 *   1. normalise names (lowercase, strip accents and unsupported characters)
 *   2. `groomName-brideName-ddmmyyyy` (groom first, like the default title)
 *   3. a short random suffix, so an address can't be guessed from the couple's
 *      names and date (decided 2026-11-24, QA D2): `akshay-princi-14022027-k7f3`
 *   4. check uniqueness; on collision draw another suffix
 * Generated once at wedding creation and never changed automatically, so
 * addresses made before the suffix keep working unchanged.
 */

const NAME_PART_MAX_LENGTH = 40;

/** "Juliët Capulet" → "juliet-capulet"; names with no Latin letters normalise to "". */
export function slugifyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, NAME_PART_MAX_LENGTH)
    .replace(/-+$/g, "");
}

/** The slug before the random suffix. */
export function baseWeddingSlug(input: {
  brideName: string;
  groomName: string;
  weddingDate: string;
}): string {
  const { year, month, day } = parseDateOnly(input.weddingDate);
  const date = `${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${year}`;
  const names = [slugifyName(input.groomName), slugifyName(input.brideName)].filter(Boolean);
  // Names in non-Latin scripts leave nothing usable; fall back to a generic prefix.
  return [...(names.length > 0 ? names : ["wedding"]), date]
    .join("-")
    .slice(0, WEDDING_SLUG_MAX_LENGTH);
}

const SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const SLUG_SUFFIX_LENGTH = 4;
/** 36^4 ≈ 1.7 million suffixes per name and date; after this many misses, use a longer one. */
const SHORT_SUFFIX_ATTEMPTS = 5;

/** Lowercase letters and digits from crypto.randomInt (never Math.random). */
export function randomSlugSuffix(length = SLUG_SUFFIX_LENGTH): string {
  let suffix = "";
  for (let i = 0; i < length; i += 1) suffix += SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)];
  return suffix;
}

/** `base-suffix`, trimming the base so the whole slug fits the length limit. */
export function withSuffix(base: string, suffix: string): string {
  const tail = `-${suffix}`;
  const head = base.slice(0, WEDDING_SLUG_MAX_LENGTH - tail.length).replace(/-+$/g, "");
  return `${head}${tail}`;
}

/** A free slug with a random suffix (the unique index is the final guard). */
export async function generateUniqueWeddingSlug(
  input: { brideName: string; groomName: string; weddingDate: string },
  suffix: (length: number) => string = randomSlugSuffix,
): Promise<string> {
  const base = baseWeddingSlug(input);
  for (let attempt = 1; ; attempt += 1) {
    const length = attempt <= SHORT_SUFFIX_ATTEMPTS ? SLUG_SUFFIX_LENGTH : SLUG_SUFFIX_LENGTH * 2;
    const slug = withSuffix(base, suffix(length));
    if (!(await weddingRepository.slugExists(slug))) return slug;
  }
}
