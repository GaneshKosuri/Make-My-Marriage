"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { cn } from "@/lib/cn";
import { MEMBER_ROLE_LABELS, type MemberRole } from "@/modules/members/member.constants";

import { NAV_ICONS } from "./nav-icons";
import { isActiveHref, type NavItem } from "./nav-items";
import { UserAvatar } from "./user-avatar";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** Desktop navigation (PRD §10). Receives items already filtered for the member's role. */
export function Sidebar({
  items,
  userName,
  role,
}: Readonly<{ items: readonly NavItem[]; userName: string; role: MemberRole }>) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-graphite/5 bg-sand md:flex">
      <Link
        href="/app"
        className={cn("mx-3 mt-4 flex items-center gap-3 rounded-lg px-2 py-2", focusRing)}
      >
        <Image src="/brand/logo-mark.svg" alt="" width={40} height={40} className="size-10" />
        <span className="font-serif text-title-lg text-burgundy">Make My Marriage</span>
      </Link>
      <nav aria-label="Main" className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        <NavList items={items} pathname={pathname} />
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
        <UserAvatar name={userName} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-label-md text-graphite">
            <span className="truncate">{userName}</span>
            <span className="rounded-full bg-sand px-2 py-0.5 text-label-sm text-gold-deep">
              {MEMBER_ROLE_LABELS[role]}
            </span>
          </p>
          <SignOutButton
            className={cn(
              "rounded text-body-sm text-plum underline-offset-4 hover:text-burgundy hover:underline disabled:opacity-60",
              focusRing,
            )}
          />
        </div>
      </div>
    </aside>
  );
}

export function NavList({
  items,
  pathname,
  onNavigate,
}: Readonly<{ items: readonly NavItem[]; pathname: string; onNavigate?: () => void }>) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        const Icon = NAV_ICONS[item.href];
        // A section with sub-pages is highlighted through its current sub-page instead.
        const current = active && !item.children?.length;
        return (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-body-md text-graphite/80 hover:bg-white/60 hover:text-graphite",
                focusRing,
                current && "bg-white font-semibold text-burgundy shadow-sm hover:bg-white",
                active && item.children?.length && "font-semibold text-graphite",
              )}
            >
              {Icon && <Icon aria-hidden className="size-[18px] shrink-0" />}
              {item.label}
            </Link>
            {item.children && item.children.length > 0 && (
              <ul className="mt-0.5 mb-1 ml-9 space-y-0.5">
                {item.children.map((child) => {
                  // Children match exactly so only one sub-item is highlighted.
                  const childActive = pathname === child.href;
                  return (
                    <li key={child.href + child.label}>
                      <Link
                        href={child.href}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-body-md text-plum hover:bg-white/60 hover:text-graphite",
                          focusRing,
                          childActive && "bg-white font-semibold text-burgundy shadow-sm",
                        )}
                      >
                        <span className="whitespace-nowrap">{child.label}</span>
                        {child.adminOnly && (
                          <span
                            aria-hidden
                            className="rounded-full bg-burgundy/10 px-2 py-0.5 text-label-sm text-burgundy"
                          >
                            Admin
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
