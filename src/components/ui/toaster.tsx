"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import type { CSSProperties } from "react";
import { Toaster } from "sonner";

/**
 * Where notifications appear: top right on every screen size (on phones too,
 * see globals.css), in the dashboard's ivory, sand and burgundy. Mounted once
 * in the root providers; `notify` from `@/lib/notify` shows them.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      duration={4500}
      visibleToasts={3}
      offset={{ top: 20, right: 20 }}
      mobileOffset={{ top: 12, right: 12 }}
      icons={{
        success: <CheckCircle2 aria-hidden className="size-5 text-gold-deep" />,
        error: <CircleAlert aria-hidden className="size-5 text-destructive" />,
        close: <X aria-hidden className="size-3" />,
      }}
      containerAriaLabel="Notifications"
      style={
        {
          "--normal-bg": "#fff",
          "--normal-border": "var(--color-sand)",
          "--normal-text": "var(--color-graphite)",
          "--border-radius": "16px",
          fontFamily: "inherit",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "gap-3! px-4! py-3.5! shadow-lg!",
          title: "text-body-md! font-semibold! text-graphite!",
          description: "text-body-sm! text-plum!",
          error: "border-destructive/30!",
          actionButton: "bg-burgundy! text-ivory! rounded-full! px-3! h-8! text-label-md!",
          closeButton: "border-sand! text-plum!",
        },
      }}
    />
  );
}
