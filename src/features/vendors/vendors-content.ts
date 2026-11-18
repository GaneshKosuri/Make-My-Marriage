/**
 * Copy for the My Vendors screens (PRD §9.16). Kept in one place so the
 * screens and their tests agree. Layout follows the Stitch screens; wording,
 * categories and colours follow the docs (decided 2026-11-18).
 */
import { VENDOR_CATEGORY_LABELS, type VendorCategory } from "@/modules/vendors/vendor.constants";

/** URL parameters /app/vendors understands (dashboard and "+" links use them). */
export const VENDORS_PARAMS = {
  search: "search",
  category: "category",
  /** "1" shows archived vendors too. */
  archived: "archived",
  /** Opens the add form straight away. */
  add: "new",
} as const;

export const VENDORS_ROUTES = {
  list: "/app/vendors",
  add: `/app/vendors?${VENDORS_PARAMS.add}=1`,
  vendor: (vendorId: string) => `/app/vendors/${vendorId}`,
  discover: "/app/vendors/discover",
} as const;

export const categoryLabel = (category: VendorCategory) => VENDOR_CATEGORY_LABELS[category];

export const VENDORS = {
  eyebrow: "Vendors",
  title: "My Vendors",
  description: "The people and businesses you've booked for the wedding.",
  add: "Add vendor",
  discover: "Discover vendors",
  search: { label: "Search vendors", placeholder: "Name or contact person" },
  filters: {
    label: "Filters",
    category: "Category",
    anyCategory: "Any category",
    showArchived: "Show archived",
    clear: "Clear filters",
  },
  count: (from: number, to: number, total: number) =>
    total === 0 ? "No vendors" : `${from}–${to} of ${total}`,
  previous: "Previous",
  next: "Next",
  agreed: (amount: string) => `Agreed ${amount}`,
  fromGoogle: "From Google",
  archived: "Archived",
  archivedEvent: (name: string) => `${name} (archived)`,
  open: (name: string) => `Open ${name}`,
  edit: (name: string) => `Edit ${name}`,
  empty: {
    title: "No vendors yet",
    description: "Save the photographer, caterer, decorator and others you book.",
    action: "Add your first vendor",
  },
  noMatches: {
    title: "No vendors match",
    description: "Try another search or category, or clear them to see every vendor.",
  },
  loadError: { title: "We couldn't load your vendors.", retry: "Try again" },
  form: {
    addTitle: "Add vendor",
    editTitle: "Edit vendor",
    fields: {
      name: { label: "Vendor name", placeholder: "e.g. Pixel Photography" },
      category: { label: "Category", placeholder: "Choose a category" },
      contactPerson: { label: "Contact person", placeholder: "e.g. Rohit" },
      phone: { label: "Phone", placeholder: "+91 98765 43210" },
      email: { label: "Email", placeholder: "name@example.com" },
      website: { label: "Website", placeholder: "pixelphotography.in" },
      address: { label: "Address", placeholder: "Street, area, city" },
      agreedCost: {
        label: "Agreed cost",
        placeholder: "2,00,000",
        hint: "What you agreed to pay in total.",
        invalid: "Enter an amount like 2,00,000 or 1,234.50",
      },
      events: {
        label: "Works at",
        hint: "The events this vendor is booked for.",
        all: "Select all",
        none: "Clear all",
        noEvents: "Add your events first; you can link this vendor to them later.",
      },
      notes: { label: "Notes", placeholder: "What's included, timings, anything to remember" },
    },
    optionsError: "We couldn't load the wedding's events for this form.",
    optionsRetry: "Try again",
    cancel: "Cancel",
    save: "Save vendor",
    saving: "Saving…",
    added: (name: string) => `${name} added.`,
    updated: (name: string) => `${name} saved.`,
    conflict: {
      title: "This vendor changed while you were editing",
      description:
        "Someone else saved changes or archived it. Reload to see the latest, then make your changes again.",
      action: "Reload vendor",
    },
    gone: {
      title: "This vendor no longer exists",
      description: "It may belong to another wedding. Close this form to see the latest.",
    },
    error: {
      title: "We couldn't save the vendor",
      description: "Check your connection and try again.",
    },
  },
  detail: {
    back: "My Vendors",
    edit: "Edit vendor",
    archive: "Archive",
    agreedCost: "Agreed cost",
    noAgreedCost: "Not added yet",
    contact: "Contact",
    call: "Call",
    email: "Email",
    website: "Website",
    openInMaps: "Open in Google Maps",
    noContact: "No contact details yet. Edit the vendor to add them.",
    booking: "Booking",
    events: "Works at",
    noEvents: "Not linked to any event yet.",
    notes: "Notes",
    archivedBanner: (date: string) =>
      `Archived on ${date}. Expenses keep the link, but it can't be changed.`,
    notFound: {
      title: "We couldn't find this vendor",
      description: "It may belong to another wedding, or the link is wrong.",
    },
    confirmArchive: {
      title: (name: string) => `Archive ${name}?`,
      description:
        "It leaves My Vendors. Expenses linked to it keep the link. This can't be undone yet.",
      confirm: "Archive vendor",
      cancel: "Keep vendor",
      error: "We couldn't archive the vendor. Try again.",
    },
    archivedNotice: (name: string) => `${name} archived.`,
  },
} as const;
