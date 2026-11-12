"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { focusRing } from "@/components/ui/button-styles";

/**
 * A modal panel in the dashboard style: a bottom sheet on phones, a centred
 * card from `md` up (same look as the "+ Add" sheet). It focuses itself when
 * opened, keeps Tab inside, closes on Escape or the backdrop, and hands focus
 * back to whatever opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}>) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // A popover inside the dialog (React Aria's calendar or time list, portaled
      // to <body>) traps its own focus and has already handled this key.
      if (event.defaultPrevented) return;
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && panelRef.current) keepFocusInside(panelRef.current, event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-50 cursor-default bg-graphite/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "fixed z-50 bg-ivory outline-none",
          // No bottom padding on phones: a sticky action bar would stick above it and
          // leave a strip of content showing underneath (QA M7). The spacer below
          // gives the end of the sheet its room instead.
          "inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] px-4 pt-3 pb-0",
          // Phones overlay scrollbars anyway; the themed one only adds noise in a sheet (QA M22).
          "pointer-coarse:[scrollbar-width:none] pointer-coarse:[&::-webkit-scrollbar]:hidden",
          "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border md:border-sand md:p-6 md:shadow-xl",
        )}
      >
        <div aria-hidden className="mx-auto mb-3 h-1 w-12 rounded-full bg-sand md:hidden" />
        {/* The title column shrinks and wraps, so the close button always stays on screen (QA M2). */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="font-serif text-title-lg wrap-anywhere text-graphite md:text-headline-sm"
            >
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-body-md wrap-anywhere text-plum">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-sand bg-white text-graphite hover:bg-sand",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {children}
        <div aria-hidden className="h-[calc(16px+env(safe-area-inset-bottom))] md:hidden" />
      </div>
    </>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab from the last control goes to the first, Shift+Tab from the first to the last. */
function keepFocusInside(panel: HTMLElement, event: KeyboardEvent) {
  const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    panel.focus();
    return;
  }
  const active = document.activeElement;
  const outside = !panel.contains(active);
  if (event.shiftKey && (active === first || active === panel || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}
