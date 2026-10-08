import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "RSVP" };

export default function RsvpPage() {
  return (
    <PagePlaceholder
      title="RSVP"
      phase="Phase 3: Guests"
      description="RSVP summary and reminders for pending guests (PRD §9.11, §9.13)."
    />
  );
}
