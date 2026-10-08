import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Discover Vendors" };

export default function DiscoverVendorsPage() {
  return (
    <PagePlaceholder
      title="Discover Vendors"
      phase="Phase 4: Financial & Vendors"
      description="Find photographers, venues, caterers and more near the wedding (PRD §9.17)."
    />
  );
}
