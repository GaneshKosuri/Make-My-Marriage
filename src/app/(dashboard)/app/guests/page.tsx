import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Guest List" };

export default function GuestsPage() {
  return (
    <PagePlaceholder
      title="Guest List"
      phase="Phase 3: Guests"
      description="Guests, invitations and WhatsApp sharing (PRD §9.7–9.14)."
    />
  );
}
