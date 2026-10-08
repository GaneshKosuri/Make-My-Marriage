import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <PagePlaceholder
      title="Log in"
      phase="Phase 1: Foundation"
      description="Email and password sign-in (PRD §9.1)."
    />
  );
}
