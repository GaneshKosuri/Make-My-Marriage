import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return (
    <PagePlaceholder
      title="Events"
      phase="Phase 2: Planning"
      description="Mehendi, Haldi, Sangeet, Wedding, Reception and custom events (PRD §9.5)."
    />
  );
}
