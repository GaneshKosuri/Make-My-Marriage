import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Wedding Website" };

export default function WebsiteSettingsPage() {
  return (
    <PagePlaceholder
      title="Wedding Website"
      phase="Phase 5: Wedding Experience"
      description="Theme, welcome message and publishing (PRD §9.18–9.19)."
    />
  );
}
