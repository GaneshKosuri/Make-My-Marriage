import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <PagePlaceholder
      title="Forgot password"
      phase="Phase 1: Foundation"
      description="We'll email you a single-use reset link (SYSTEM_DESIGN §12)."
    />
  );
}
