import type { Metadata } from "next";

import { WeddingDetailsScreen } from "@/features/weddings/components/wedding-details-screen";

export const metadata: Metadata = { title: "Wedding Details" };

/**
 * Settings → Wedding Details (PRD §9.25). Admins and Managers both edit; the
 * layout's guard has already checked the membership, and the form loads and
 * saves through GET/PATCH /api/wedding.
 */
export default function SettingsPage() {
  return <WeddingDetailsScreen />;
}
