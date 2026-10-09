"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/cn";

import type { NavLink } from "../home-content";

/**
 * Phone/tablet navigation (Stitch mobile header). The panel drops below the
 * sticky header; it closes on Escape, on a link tap, and when the viewport
 * reaches `lg`, where the desktop nav takes over.
 */
export function MobileMenu({
  links,
  signIn,
  className,
}: Readonly<{ links: readonly NavLink[]; signIn: NavLink; className?: string }>) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  const close = () => setOpen(false);
  const linkClass =
    "block rounded-xl px-3 py-3 text-title-md text-graphite hover:bg-sand focus-visible:outline-2 focus-visible:outline-burgundy";

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full text-burgundy transition-colors hover:bg-sand/60 focus-visible:outline-2 focus-visible:outline-burgundy"
      >
        {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
      </button>
      <nav
        id={panelId}
        aria-label="Menu"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-sand bg-ivory px-4 pt-2 pb-4 shadow-lg md:px-12"
      >
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={close} className={linkClass}>
                {link.label}
              </a>
            </li>
          ))}
          <li className="mt-2 border-t border-sand pt-2">
            <Link href={signIn.href} onClick={close} className={cn(linkClass, "text-burgundy")}>
              {signIn.label}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
