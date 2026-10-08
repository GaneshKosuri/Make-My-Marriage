"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/cn";

import { isActiveHref, MOBILE_PRIMARY_HREFS, type NavItem } from "./nav-items";
import { NavList } from "./sidebar";

/**
 * Mobile navigation (PRD §12.3): a bottom bar with the primary destinations and
 * a "Menu" button that opens a drawer with the full navigation.
 */
export function MobileNav({ items }: Readonly<{ items: readonly NavItem[] }>) {
  const pathname = usePathname();
  // The drawer remembers the path it was opened on, so any navigation closes it
  // (routes stay mounted under Cache Components' <Activity>).
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const drawerId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const primary = MOBILE_PRIMARY_HREFS.map((href) =>
    items.find((item) => item.href === href),
  ).filter((item): item is NavItem => Boolean(item));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden"
      >
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveHref(pathname, item.href) ? "page" : undefined}
            className={cn(
              "px-1 py-3 text-center text-xs font-medium text-muted-foreground",
              isActiveHref(pathname, item.href) && "text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls={drawerId}
          className="px-1 py-3 text-xs font-medium text-muted-foreground"
        >
          Menu
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-card p-4 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-lg font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm hover:bg-accent"
              >
                Close
              </button>
            </div>
            <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
