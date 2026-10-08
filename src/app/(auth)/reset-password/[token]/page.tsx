import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

// The token is a secret: never indexed, never leaked via Referer (next.config.ts headers too).
export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** /reset-password/[token] — page URL decided in binding decision 12. */
export default function ResetPasswordPage() {
  return (
    <PagePlaceholder
      title="Choose a new password"
      phase="Phase 1: Foundation"
      description="Reset links expire and work once (DATABASE_DESIGN §12)."
    />
  );
}
