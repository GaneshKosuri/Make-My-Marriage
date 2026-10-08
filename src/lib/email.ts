/**
 * Email normalisation shared by users, member invitations and guests
 * (DATABASE_DESIGN §7): trim and lowercase only — no provider-specific rules
 * such as Gmail dot removal.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
