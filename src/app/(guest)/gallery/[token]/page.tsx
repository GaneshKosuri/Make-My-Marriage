import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Wedding gallery" };

/** /gallery/[token] — view and upload wedding photos via the QR / shared link (PRD §9.20–9.23). */
export default function GalleryPage() {
  return (
    <PagePlaceholder
      title="Share the memories"
      phase="Phase 6: Memories"
      description="View the wedding gallery and upload your photos from your phone."
    />
  );
}
