import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { SettingsTabs } from "@/components/layout/settings-tabs";

export const metadata: Metadata = { title: "Wedding Details" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <SettingsTabs />
      <PagePlaceholder
        title="Wedding Details"
        phase="Phase 1: Foundation"
        description="Couple names, date, location, cover image and description (PRD §9.25)."
      />
    </div>
  );
}
