/** The wedding identity the signed-in pages render (names, date, place). Client-safe. */
export interface CoupleWedding {
  brideName: string;
  groomName: string;
  title: string | null;
  weddingDate: string;
  timeZone: string;
  city: string | null;
  state: string | null;
}

/**
 * The couple identity shown on every signed-in page and guest page (PRD §12.1).
 * Uses the organisers' own title when set; otherwise groom first, e.g.
 * "Romeo & Juliet" (decided 2026-10-10, matching the PRD's "Akshay ❤️ Princi").
 */
export function coupleDisplayName(wedding: {
  brideName: string;
  groomName: string;
  title?: string | null;
}): string {
  return wedding.title?.trim() || `${wedding.groomName} & ${wedding.brideName}`;
}

/** Countdown wording for a number of days from `daysUntil` (PRD §9.3). */
export function weddingCountdownLabel(days: number): string {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow!";
  if (days === 0) return "Today!";
  return "Married";
}

/** "Dehradun, Uttarakhand"; null when no place is set. */
export function weddingPlace(wedding: {
  city: string | null;
  state: string | null;
}): string | null {
  const parts = [wedding.city, wedding.state].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Up to two initials for an avatar: "Akshay Saini" → "AS", "Princi" → "P". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words.at(-1)] : words.slice(0, 1);
  return letters.map((word) => word!.charAt(0).toUpperCase()).join("");
}
