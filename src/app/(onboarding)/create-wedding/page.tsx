import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Create your wedding" };

export default function CreateWeddingPage() {
  return (
    <PagePlaceholder
      title="Create your wedding"
      phase="Phase 1: Foundation"
      description="Bride and groom names, date, location and title. You become its first Admin (PRD §9.2)."
    />
  );
}
