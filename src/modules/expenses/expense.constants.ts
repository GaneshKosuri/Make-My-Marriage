/** Expense tracker (PRD §9.15; DATABASE_DESIGN §50, §55–59). Isomorphic. Not a budget. */

/** DATABASE_DESIGN §56 values (OTHER, not "Miscellaneous" — binding decision 7). */
export const EXPENSE_CATEGORIES = [
  "VENUE",
  "CATERING",
  "PHOTOGRAPHY",
  "VIDEOGRAPHY",
  "DECORATION",
  "CLOTHING",
  "JEWELLERY",
  "ENTERTAINMENT",
  "INVITATIONS",
  "GIFTS",
  "TRAVEL",
  "MAKEUP",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  VENUE: "Venue",
  CATERING: "Catering",
  PHOTOGRAPHY: "Photography",
  VIDEOGRAPHY: "Videography",
  DECORATION: "Decoration",
  CLOTHING: "Clothing",
  JEWELLERY: "Jewellery",
  ENTERTAINMENT: "Entertainment",
  INVITATIONS: "Invitations",
  GIFTS: "Gifts",
  TRAVEL: "Travel",
  MAKEUP: "Makeup",
  OTHER: "Other",
};

export const EXPENSE_CURRENCIES = ["INR"] as const;
export type ExpenseCurrency = (typeof EXPENSE_CURRENCIES)[number];

export const EXPENSE_TITLE_MAX_LENGTH = 200;
export const EXPENSE_NOTES_MAX_LENGTH = 2000;
/** Integer paise; ₹100 crore ceiling as a sanity bound (not a budget). */
export const EXPENSE_AMOUNT_MAX_PAISE = 100_000_000_000;
