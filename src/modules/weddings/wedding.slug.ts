import "server-only";

import { parseDateOnly } from "@/lib/dates";

import { WEDDING_SLUG_MAX_LENGTH } from "./wedding.constants";
import { weddingRepository } from "./wedding.repository";

/**
 * Website slug generation (SYSTEM_DESIGN §27, DATABASE_DESIGN §18):
 *   1. normalise names (lowercase, strip accents and unsupported characters)
 *   2. `groomName-brideName-ddmmyyyy` (groom first, like the default title)
 *   3. check uniqueness; on collision append `-2`, `-3`, …
 * Generated once at wedding creation and never changed automatically.
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

/** The slug before any collision suffix. */
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

export function withSuffix(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return `${base.slice(0, WEDDING_SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
}

/** First free slug: base, base-2, base-3, … (the unique index is the final guard). */
export async function generateUniqueWeddingSlug(input: {
  brideName: string;
  groomName: string;
  weddingDate: string;
}): Promise<string> {
  const base = baseWeddingSlug(input);
  for (let attempt = 1; ; attempt += 1) {
    const slug = withSuffix(base, attempt);
    if (!(await weddingRepository.slugExists(slug))) return slug;
  }
}
