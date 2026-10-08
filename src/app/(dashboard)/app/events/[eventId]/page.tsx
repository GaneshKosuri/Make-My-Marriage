import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Event" };

export default function EventDetailPage() {
  return (
    <PagePlaceholder
      title="Event"
      phase="Phase 2: Planning"
      description="Event details, venue, dress code and related tasks (PRD §9.5)."
    />
  );
}
