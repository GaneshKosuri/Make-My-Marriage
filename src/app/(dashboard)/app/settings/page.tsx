import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Wedding Details" };

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Wedding Details"
      phase="Phase 1: Foundation"
      description="Couple names, date, location, cover image and description (PRD §9.25)."
    />
  );
}
