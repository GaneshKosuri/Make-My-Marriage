import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "QR Code" };

export default function PhotosQrPage() {
  return (
    <PagePlaceholder
      title="QR Code"
      phase="Phase 6: Memories"
      description="A printable QR code that opens the guest gallery (PRD §9.23)."
    />
  );
}
