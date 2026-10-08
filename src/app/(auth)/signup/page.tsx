import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <PagePlaceholder
      title="Create your account"
      phase="Phase 1: Foundation"
      description="Name, email and password — no email verification (PRD §9.1)."
    />
  );
}
