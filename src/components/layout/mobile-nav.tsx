"use client";

import { ChevronRight, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { SIGN_OUT } from "@/features/auth/auth-content";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { cn } from "@/lib/cn";
import { MEMBER_ROLE_LABELS, type MemberRole } from "@/modules/members/member.constants";

import { NAV_HINTS, NAV_ICONS } from "./nav-icons";
import { isActiveHref, MOBILE_PRIMARY_HREFS, moreGroups, type NavItem } from "./nav-items";
import { UserAvatar } from "./user-avatar";
import { useSheet } from "./use-sheet";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** Bottom-bar labels: "Dashboard" is "Home" on phones (Stitch mobile designs). */
const SHORT_LABELS: Readonly<Record<string, string>> = { "/app": "Home" };

/**
 * Mobile navigation (PRD §12.3): a bottom bar with the primary destinations and
 * "More", a sheet with every other page, the signed-in member and sign out.
 */
export function MobileNav({
  items,
  userName,
  userEmail,
  role,
}: Readonly<{ items: readonly NavItem[]; userName: string; userEmail: string; role: MemberRole }>) {
  const pathname = usePathname();
  const { open, show, dismiss, close, triggerRef, panelRef } = useSheet();
  const sheetId = useId();
  const titleId = useId();

  const primary = MOBILE_PRIMARY_HREFS.map((href) =>
    items.find((item) => item.href === href),
  ).filter((item): item is NavItem => Boolean(item));
  const groups = moreGroups(items);
  const moreActive = !open && !primary.some((item) => isActiveHref(pathname, item.href));

  const tab = (active: boolean) =>
    cn(
      "flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 text-label-sm text-plum",
      focusRing,
      active && "text-burgundy",
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sand bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {primary.map((item) => {
          const Icon = NAV_ICONS[item.href];
          const active = isActiveHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={tab(active)}
            >
              {Icon && <Icon aria-hidden className="size-5" />}
              {SHORT_LABELS[item.href] ?? item.label}
            </Link>
          );
        })}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? dismiss() : show())}
          aria-expanded={open}
          aria-controls={sheetId}
          className={tab(open || moreActive)}
        >
          <Menu aria-hidden className="size-5" />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            className="absolute inset-0 cursor-default bg-graphite/40"
            onClick={dismiss}
          />
          <div
            ref={panelRef}
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-[28px] bg-ivory px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] outline-none"
          >
            <div aria-hidden className="mx-auto mb-3 h-1 w-12 rounded-full bg-sand" />
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 id={titleId} className="font-serif text-headline-md text-graphite">
                More
              </h2>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close menu"
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-full border border-sand bg-white text-graphite",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            {groups.map((group) => (
              <section key={group.label} className="mb-5" aria-label={group.label}>
                <h3 className="mb-2 px-1 text-eyebrow text-gold-deep uppercase">{group.label}</h3>
                <ul className="divide-y divide-sand overflow-hidden rounded-2xl border border-sand bg-white">
                  {group.items.map((item) => {
                    const Icon = NAV_ICONS[item.href];
                    const current = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={close}
                          aria-current={current ? "page" : undefined}
                          className={cn("flex items-center gap-3 p-3", focusRing)}
                        >
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ivory text-burgundy">
                            {Icon && <Icon aria-hidden className="size-5" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-label-md text-graphite">
                              {item.label}
                              {item.adminOnly && (
                                <span
                                  aria-hidden
                                  className="rounded-full bg-burgundy px-2 py-0.5 text-label-sm text-ivory"
                                >
                                  Admin
                                </span>
                              )}
                            </span>
                            {NAV_HINTS[item.href] && (
                              <span className="block truncate text-body-sm text-plum">
                                {NAV_HINTS[item.href]}
                              </span>
                            )}
                          </span>
                          <ChevronRight aria-hidden className="size-4 text-plum" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            <div className="flex items-center gap-3 rounded-2xl border border-sand bg-white p-3">
              <UserAvatar name={userName} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-label-md text-graphite">
                  <span className="truncate">{userName}</span>
                  <span className="rounded-full bg-sand px-2 py-0.5 text-label-sm text-gold-deep">
                    {MEMBER_ROLE_LABELS[role]}
                  </span>
                </p>
                <p className="truncate text-body-sm text-plum">{userEmail}</p>
              </div>
              <SignOutButton
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-label-md text-burgundy hover:bg-sand disabled:opacity-60",
                  focusRing,
                )}
              >
                <LogOut aria-hidden className="size-4" />
                {SIGN_OUT}
              </SignOutButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
