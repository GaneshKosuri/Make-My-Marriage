/**
 * The couple identity shown on every signed-in page and guest page (PRD §12.1).
 * Uses the organisers' own title when set, e.g. "Akshay ❤️ Princi".
 */
export function coupleDisplayName(wedding: {
  brideName: string;
  groomName: string;
  title?: string | null;
}): string {
  return wedding.title?.trim() || `${wedding.brideName} & ${wedding.groomName}`;
}
