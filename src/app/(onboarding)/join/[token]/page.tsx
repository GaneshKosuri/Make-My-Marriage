import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = {
  title: "Join a wedding",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** /join/[token] — Wedding Member invitation acceptance (binding decision 12; API_DESIGN §25–26). */
export default function JoinWeddingPage() {
  return (
    <PagePlaceholder
      title="You're invited to help plan a wedding"
      phase="Phase 1: Foundation"
      description="Sign up or log in with the invited email address to join (SYSTEM_DESIGN §19)."
    />
  );
}
