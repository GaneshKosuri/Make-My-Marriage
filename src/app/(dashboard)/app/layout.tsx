import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Make My Marriage" },
  robots: { index: false, follow: false },
};

/**
 * /app/* — Wedding Members only.
 *
 * The session read happens inside <Suspense> (Cache Components): the skeleton
 * is the prerendered static shell and the guarded shell streams in per
 * request. `children` render INSIDE the guard, so no page content is produced
 * before the checks pass. src/proxy.ts already bounced requests without a
 * session cookie; this is the real check.
 */
export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <GuardedAppShell>{children}</GuardedAppShell>
    </Suspense>
  );
}

async function GuardedAppShell({ children }: Readonly<{ children: ReactNode }>) {
  const current = await getCurrentContext();
  if (!current) redirect("/login");
  if (!current.membership || !current.wedding) redirect("/create-wedding");

  return (
    <AppShell role={current.membership.role} userName={current.user.name} wedding={current.wedding}>
      {children}
    </AppShell>
  );
}
