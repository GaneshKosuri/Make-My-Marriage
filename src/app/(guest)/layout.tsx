import type { Metadata } from "next";
import type { ReactNode } from "react";

import { GuestShell } from "@/components/layout/guest-shell";

/**
 * Token pages for guests (invitation, gallery): mobile-first, no account, never
 * indexed, no Referer leakage (PRD §12.3–12.4, §13; API_DESIGN §50). next.config.ts
 * also sends X-Robots-Tag: noindex and Referrer-Policy: no-referrer for these paths.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function GuestLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <GuestShell>{children}</GuestShell>;
}
