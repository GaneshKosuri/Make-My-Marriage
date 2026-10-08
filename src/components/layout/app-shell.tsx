import type { ReactNode } from "react";

import type { MemberRole } from "@/modules/members/member.constants";

import { MobileNav } from "./mobile-nav";
import { navItemsForRole } from "./nav-items";
import { Sidebar } from "./sidebar";
import { WeddingHeader, type WeddingHeaderProps } from "./wedding-header";

export interface AppShellProps {
  role: MemberRole;
  userName: string;
  wedding: WeddingHeaderProps["wedding"];
  children: ReactNode;
}

/**
 * The signed-in dashboard frame: sidebar on desktop, bottom bar + drawer on
 * mobile, couple header everywhere. Role filtering happens here, on the server.
 */
export function AppShell({ role, userName, wedding, children }: Readonly<AppShellProps>) {
  const items = navItemsForRole(role);
  return (
    <div className="flex min-h-dvh">
      <Sidebar items={items} />
      <div className="flex min-w-0 flex-1 flex-col">
        <WeddingHeader wedding={wedding} userName={userName} role={role} />
        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>
      <MobileNav items={items} />
    </div>
  );
}

/** Static shell shown while the session is checked (prerendered under Cache Components). */
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading your wedding">
      <div className="hidden w-64 shrink-0 border-r bg-card md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-[73px] border-b bg-card" />
        <div className="flex-1 px-4 pt-6 md:px-8">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        </div>
      </div>
    </div>
  );
}
