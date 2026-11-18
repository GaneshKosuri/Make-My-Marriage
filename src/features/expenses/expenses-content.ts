/**
 * Copy for the expense screens (PRD §9.15). Kept in one place so the screens
 * and their tests agree. A tracker of money already spent or committed: never
 * a budget, a balance or a limit. Layout follows the Stitch screens; wording,
 * categories and colours follow the docs (decided 2026-11-18).
 */
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/modules/expenses/expense.constants";

/** URL parameters /app/expenses understands (dashboard and "+" links use them). */
export const EXPENSES_PARAMS = {
  category: "category",
  eventId: "eventId",
  vendorId: "vendorId",
  from: "from",
  to: "to",
  /** Opens the add form straight away. */
  add: "new",
} as const;

export const EXPENSES_ROUTES = {
  list: "/app/expenses",
  add: `/app/expenses?${EXPENSES_PARAMS.add}=1`,
  /** The add form with a vendor already chosen (from the vendor's page). */
  addForVendor: (vendorId: string) =>
    `/app/expenses?${EXPENSES_PARAMS.add}=1&${EXPENSES_PARAMS.vendorId}=${vendorId}`,
  forVendor: (vendorId: string) => `/app/expenses?${EXPENSES_PARAMS.vendorId}=${vendorId}`,
} as const;

export const expenseCategoryLabel = (category: ExpenseCategory) =>
  EXPENSE_CATEGORY_LABELS[category];

export const EXPENSES = {
  eyebrow: "Money",
  title: "Expenses",
  description: "Money already spent or committed for the wedding. Not a budget.",
  add: "Add expense",
  summary: {
    label: "Expenses at a glance",
    total: "Total wedding expense",
    count: (count: number) => (count === 1 ? "Across 1 expense" : `Across ${count} expenses`),
    byCategory: "By category",
  },
  filters: {
    label: "Filters",
    toggle: (active: number) => (active > 0 ? `Filters (${active})` : "Filters"),
    category: "Category",
    anyCategory: "Any category",
    event: "Event",
    anyEvent: "Any event",
    vendor: "Vendor",
    anyVendor: "Any vendor",
    dates: "Dates",
    clear: "Clear filters",
  },
  count: (from: number, to: number, total: number) =>
    total === 0 ? "No expenses" : `${from}–${to} of ${total}`,
  previous: "Previous",
  next: "Next",
  archived: (name: string) => `${name} (archived)`,
  edit: (title: string) => `Edit ${title}`,
  empty: {
    title: "No expenses yet",
    description: "Record money as it is spent: advances, bills, shopping.",
    action: "Add your first expense",
  },
  noMatches: {
    title: "No expenses match these filters",
    description: "Try other filters, or clear them to see every expense.",
  },
  loadError: { title: "We couldn't load your expenses.", retry: "Try again" },
  form: {
    addTitle: "Add expense",
    editTitle: "Edit expense",
    fields: {
      title: { label: "What was it for?", placeholder: "e.g. Photographer advance" },
      amount: {
        label: "Amount",
        placeholder: "50,000",
        invalid: "Enter an amount like 50,000 or 1,234.50",
        zero: "Amount must be more than ₹0",
      },
      date: { label: "Date" },
      category: { label: "Category", placeholder: "Choose a category" },
      event: { label: "Event", none: "No event" },
      vendor: {
        label: "Vendor",
        none: "No vendor",
        categoryFromVendor: "Category set from the vendor",
      },
      notes: {
        label: "Notes",
        placeholder: "Receipt number, how it was paid, anything to remember",
      },
    },
    optionsError: "We couldn't load the wedding's events and vendors for this form.",
    optionsRetry: "Try again",
    cancel: "Cancel",
    save: "Save expense",
    saving: "Saving…",
    delete: "Delete expense",
    confirmDelete: {
      prompt: (title: string, amount: string) =>
        `Delete "${title}", ${amount}? This can't be undone.`,
      confirm: "Delete expense",
      cancel: "Keep expense",
    },
    added: (title: string) => `"${title}" added.`,
    updated: (title: string) => `"${title}" saved.`,
    deleted: (title: string) => `"${title}" deleted.`,
    conflict: {
      title: "This expense changed while you were editing",
      description:
        "Someone else saved changes. Reload to see the latest, then make your changes again.",
      action: "Reload expense",
    },
    gone: {
      title: "This expense no longer exists",
      description: "Someone may have deleted it. Close this form to see the latest.",
    },
    error: {
      title: "We couldn't save the expense",
      description: "Check your connection and try again.",
    },
  },
  vendorCard: {
    title: "Expenses for this vendor",
    recorded: "Recorded so far",
    none: "No expenses recorded for this vendor yet.",
    add: "Add expense",
    viewAll: (count: number) => `View all ${count} expenses`,
    loadError: "We couldn't load this vendor's expenses.",
  },
} as const;
