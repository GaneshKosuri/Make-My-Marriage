import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Live Stream" };

export default function LivestreamPage() {
  return (
    <PagePlaceholder
      title="Live Stream"
      phase="Phase 5: Wedding Experience"
      description="Add, update or remove the YouTube Live URL (PRD §9.24)."
    />
  );
}
