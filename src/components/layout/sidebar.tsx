"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

import { isActiveHref, type NavItem } from "./nav-items";

/** Desktop navigation (PRD §10). Receives items already filtered for the member's role. */
export function Sidebar({ items }: Readonly<{ items: readonly NavItem[] }>) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <Link href="/app" className="flex items-center gap-2 px-5 py-5">
        <Image src="/brand/logo-mark.svg" alt="" width={32} height={32} />
        <span className="font-serif text-lg font-semibold">Make My Marriage</span>
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-6">
        <NavList items={items} pathname={pathname} />
      </nav>
    </aside>
  );
}

export function NavList({
  items,
  pathname,
  onNavigate,
}: Readonly<{ items: readonly NavItem[]; pathname: string; onNavigate?: () => void }>) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active && !item.children ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent",
                active && "bg-accent text-accent-foreground",
              )}
            >
              {item.label}
            </Link>
            {item.children && item.children.length > 0 && (
              <ul className="mt-1 ml-3 space-y-1 border-l pl-3">
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
                          "block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                          childActive && "font-medium text-foreground",
                        )}
                      >
                        {child.label}
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
