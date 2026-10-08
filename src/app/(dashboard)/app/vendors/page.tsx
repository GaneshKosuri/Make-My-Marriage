import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "My Vendors" };

export default function VendorsPage() {
  return (
    <PagePlaceholder
      title="My Vendors"
      phase="Phase 4: Financial & Vendors"
      description="Vendors selected for the wedding (PRD §9.16)."
    />
  );
}
