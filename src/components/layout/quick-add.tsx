"use client";

import {
  CalendarDays,
  ChevronRight,
  Camera,
  ListChecks,
  Plus,
  Receipt,
  Store,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { cn } from "@/lib/cn";

import { useSheet } from "./use-sheet";

/** Shortcuts to the pages where each kind of record is added (Stitch "Quick Add Sheet"). */
export const QUICK_ADD_ITEMS: readonly {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Add event",
    hint: "Mehendi, Haldi, Sangeet or your own",
    href: "/app/events",
    icon: CalendarDays,
  },
  {
    label: "Add task",
    hint: "Something to do, with a due date",
    href: "/app/tasks",
    icon: ListChecks,
  },
  {
    label: "Add guest",
    hint: "A guest or a family, with how many can come",
    href: "/app/guests",
    icon: UserPlus,
  },
  { label: "Add expense", hint: "Record money spent", href: "/app/expenses", icon: Receipt },
  {
    label: "Add vendor",
    hint: "Save a photographer, caterer or decorator's details",
    href: "/app/vendors",
    icon: Store,
  },
  {
    label: "Upload photos",
    hint: "Add to your private gallery",
    href: "/app/photos",
    icon: Camera,
  },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * "+ Add" in the desktop top bar (a menu under the button) and the floating
 * "+" on phones (a bottom sheet). `subtitle` is the sheet's eyebrow, e.g.
 * "Akshay & Princi · 42 days to go".
 */
export function QuickAdd({
  variant,
  subtitle,
}: Readonly<{ variant: "button" | "fab"; subtitle: string }>) {
  const { open, show, dismiss, close, triggerRef, panelRef } = useSheet();
  const panelId = useId();
  const titleId = useId();
  const sheet = variant === "fab";

  return (
    <div className={cn(sheet ? "md:hidden" : "relative hidden md:block")}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? dismiss() : show())}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={sheet ? "Add to your wedding" : undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 bg-burgundy text-ivory shadow-md hover:bg-burgundy-deep",
          focusRing,
          sheet
            ? "fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 size-14 rounded-full"
            : "h-11 rounded-full px-5 text-label-md",
        )}
      >
        <Plus aria-hidden className={sheet ? "size-6" : "size-4"} />
        {!sheet && "Add"}
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close"
            onClick={dismiss}
            className={cn(
              "fixed inset-0 z-50 cursor-default",
              sheet ? "bg-graphite/40" : "bg-transparent",
            )}
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal={sheet || undefined}
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "z-50 bg-ivory outline-none",
              sheet
                ? "fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]"
                : "absolute top-full right-0 mt-2 w-[400px] rounded-3xl border border-sand p-3 shadow-xl",
            )}
          >
            {sheet && <div aria-hidden className="mx-auto mb-3 h-1 w-12 rounded-full bg-sand" />}
            <div className="mb-3 flex items-start justify-between gap-3 px-1">
              <div>
                <p className="text-eyebrow text-gold-deep uppercase">{subtitle}</p>
                <h2 id={titleId} className="mt-1 font-serif text-headline-sm text-graphite">
                  Add to your wedding
                </h2>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                className={cn(
                  "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-sand bg-white text-graphite hover:bg-sand",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {QUICK_ADD_ITEMS.map(({ label, hint, href, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-sand bg-white p-3 hover:border-gold/60",
                      focusRing,
                    )}
                  >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-ivory text-burgundy">
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-label-md text-graphite">{label}</span>
                      <span className="block truncate text-body-sm text-plum">{hint}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 text-plum" />
                  </Link>
                </li>
              ))}
            </ul>
            {sheet && (
              <button
                type="button"
                onClick={dismiss}
                className={cn(
                  "mt-4 h-12 w-full rounded-full border border-sand bg-white text-label-md text-graphite",
                  focusRing,
                )}
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
