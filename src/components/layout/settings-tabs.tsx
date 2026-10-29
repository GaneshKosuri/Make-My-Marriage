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
    <nav aria-label="Settings" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-1 rounded-full border border-sand bg-white p-1">
        {TABS.map((tab) => {
          const current = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-4 text-label-md whitespace-nowrap transition-colors",
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
