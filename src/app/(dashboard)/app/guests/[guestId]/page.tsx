import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Guest" };

export default function GuestDetailPage() {
  return (
    <PagePlaceholder
      title="Guest"
      phase="Phase 3: Guests"
      description="Guest details, invited events, invitation link and RSVP (PRD §9.7–9.11)."
    />
  );
}
