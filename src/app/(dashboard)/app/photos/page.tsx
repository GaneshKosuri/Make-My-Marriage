import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Gallery" };

export default function PhotosPage() {
  return (
    <PagePlaceholder
      title="Gallery"
      phase="Phase 6: Memories"
      description="Private wedding gallery, albums by event and uploads (PRD §9.20–9.22)."
    />
  );
}
