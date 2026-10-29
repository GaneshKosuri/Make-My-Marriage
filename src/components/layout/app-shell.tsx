import type { ReactNode } from "react";

import type { CoupleWedding } from "@/lib/couple";
import type { MemberRole } from "@/modules/members/member.constants";

import { MobileNav } from "./mobile-nav";
import { navItemsForRole } from "./nav-items";
import { QuickAdd } from "./quick-add";
import { Sidebar } from "./sidebar";
import { quickAddSubtitle, WeddingHeader } from "./wedding-header";

export interface AppShellProps {
  role: MemberRole;
  user: { name: string; email: string };
  wedding: CoupleWedding;
  children: ReactNode;
}

/**
 * The signed-in dashboard frame: sidebar on desktop, bottom bar + "More" sheet
 * on phones, couple header everywhere. Role filtering happens here, on the server.
 */
export function AppShell({ role, user, wedding, children }: Readonly<AppShellProps>) {
  const items = navItemsForRole(role);
  return (
    <div className="flex min-h-dvh bg-ivory text-graphite">
      <Sidebar items={items} userName={user.name} role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WeddingHeader wedding={wedding} userName={user.name} />
        <main className="flex-1 px-4 pt-4 pb-32 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>
      <MobileNav items={items} userName={user.name} userEmail={user.email} role={role} />
      <QuickAdd variant="fab" subtitle={quickAddSubtitle(wedding)} />
    </div>
  );
}

/** Static shell shown while the session is checked (prerendered under Cache Components). */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-ivory" aria-busy="true" aria-label="Loading your wedding">
      <div className="hidden w-64 shrink-0 bg-sand md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-[65px] border-b border-sand md:h-[81px]" />
        <div className="flex-1 px-4 pt-4 md:px-8 md:pt-8">
          <div className="h-48 animate-pulse rounded-3xl bg-sand/70" />
        </div>
      </div>
    </div>
  );
}
