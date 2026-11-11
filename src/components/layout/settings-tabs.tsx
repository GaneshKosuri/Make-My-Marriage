"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

const TABS = [
  { label: "Wedding Details", href: "/app/settings" },
  { label: "Wedding Members", href: "/app/settings/members" },
] as const;

/** The Settings sub-navigation shared by its pages (Stitch prompt 10: Details, Members). */
export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings">
      {/* Two equal columns across the width on phones, a compact pill row from sm (QA M16). */}
      <ul className="grid w-full grid-cols-2 gap-1 rounded-full border border-sand bg-white p-1 sm:flex sm:w-max">
        {TABS.map((tab) => {
          const current = pathname === tab.href;
          return (
            <li key={tab.href} className="min-w-0">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 w-full items-center justify-center rounded-full px-1 text-center text-label-md leading-tight transition-colors sm:inline-flex sm:h-10 sm:w-auto sm:px-4 sm:whitespace-nowrap",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                  current
                    ? "bg-burgundy text-ivory"
                    : "text-plum hover:bg-ivory hover:text-graphite",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
