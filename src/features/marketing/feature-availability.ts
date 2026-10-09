/**
 * Which product features are live. This is the single switch behind every
 * "Coming soon" badge on the home page and the FAQ's "What features are coming
 * next?" answer: flip a feature to "live" when its phase ships (PRD §16).
 */
export type FeatureAvailability = "live" | "coming-soon";

const availability = {
  events: "live",
  tasks: "live",
  guests: "live",
  familyMembers: "live",
  organiserGallery: "live",
  expenses: "coming-soon",
  vendors: "coming-soon",
  vendorDiscovery: "coming-soon",
  website: "coming-soon",
  livestream: "coming-soon",
  guestPhotoUploads: "coming-soon",
  emailInvitations: "coming-soon",
} satisfies Record<string, FeatureAvailability>;

export type ProductFeature = keyof typeof availability;

export const FEATURE_AVAILABILITY: Readonly<Record<ProductFeature, FeatureAvailability>> =
  availability;

export function isComingSoon(
  feature: ProductFeature,
  source: Readonly<Record<ProductFeature, FeatureAvailability>> = FEATURE_AVAILABILITY,
): boolean {
  return source[feature] === "coming-soon";
}

/** How each feature is named in the "coming next" FAQ answer. */
const UPCOMING_LABELS: Readonly<Record<ProductFeature, string>> = {
  events: "events",
  tasks: "tasks",
  guests: "guest lists and RSVPs",
  familyMembers: "family members and roles",
  organiserGallery: "the organiser photo gallery",
  expenses: "expense tracking",
  vendors: "My Vendors",
  vendorDiscovery: "vendor discovery",
  website: "a wedding website with three themes",
  livestream: "a YouTube livestream",
  guestPhotoUploads: "guest photo uploads by QR code",
  emailInvitations: "email invitations with RSVP reminders",
};

/** "Expense tracking, My Vendors, … and email invitations with RSVP reminders." or null when everything is live. */
export function upcomingFeaturesSentence(
  source: Readonly<Record<ProductFeature, FeatureAvailability>> = FEATURE_AVAILABILITY,
): string | null {
  const names = (Object.keys(source) as ProductFeature[])
    .filter((feature) => isComingSoon(feature, source))
    .map((feature) => UPCOMING_LABELS[feature]);
  if (names.length === 0) return null;

  const sentence = new Intl.ListFormat("en-IN", { type: "conjunction" }).format(names);
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
