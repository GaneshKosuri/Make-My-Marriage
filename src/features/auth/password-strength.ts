import { PASSWORD_MIN_LENGTH } from "@/modules/auth/auth.constants";

export type PasswordStrength = 0 | 1 | 2 | 3;

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: "Too short",
  1: "Fair",
  2: "Good",
  3: "Strong",
};

/**
 * A simple, explainable meter for the 3-segment bar. Only the minimum length is
 * a rule (PRD §9.1); length beyond it and character variety raise the score.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length >= 16 || (password.length >= 12 && variety >= 3)) return 3;
  if (password.length >= 12 || variety >= 3) return 2;
  return 1;
}
