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
