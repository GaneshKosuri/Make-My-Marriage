import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

// The token is a secret: never indexed, never leaked via Referer (next.config.ts headers too).
export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** /reset-password/[token] — page URL decided in binding decision 12. */
export default function ResetPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  // The token is request-time data under Cache Components, so read it inside <Suspense>.
  return (
    <Suspense>
      <ResetPassword params={params} />
    </Suspense>
  );
}

async function ResetPassword({ params }: Pick<PageProps<"/reset-password/[token]">, "params">) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
