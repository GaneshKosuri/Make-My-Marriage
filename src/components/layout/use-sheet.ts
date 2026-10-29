"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Open state for a menu or sheet. It closes on navigation (it remembers the
 * path it was opened on, because routes stay mounted under Cache Components'
 * <Activity>) and on Escape. Dismissing it (Escape, backdrop, close button)
 * hands focus back to the trigger; following a link inside it does not.
 */
export function useSheet<T extends HTMLElement = HTMLButtonElement>() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const triggerRef = useRef<T>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedOn(null);
      triggerRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return {
    open,
    show: () => setOpenedOn(pathname),
    /** Closes and returns focus to the trigger. */
    dismiss: () => {
      setOpenedOn(null);
      triggerRef.current?.focus();
    },
    /** Closes without moving focus, e.g. when a link inside was followed. */
    close: () => setOpenedOn(null),
    triggerRef,
    panelRef,
  };
}
