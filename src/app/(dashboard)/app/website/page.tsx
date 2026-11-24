import type { Metadata } from "next";
import { Suspense } from "react";

import { WebsiteScreen } from "@/features/website/components/website-screen";
import { coupleDisplayName } from "@/lib/couple";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Wedding Website" };

/** /app/website (PRD §9.18–9.19): publish, share and shape the wedding website. */
export default function WebsiteSettingsPage() {
  return (
    <Suspense fallback={null}>
      <Website />
    </Suspense>
  );
}

async function Website() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return (
    <WebsiteScreen
      // Names, never the custom title: the message reads "Akshay & Princi are getting married!".
      coupleName={coupleDisplayName({
        brideName: current.wedding.brideName,
        groomName: current.wedding.groomName,
      })}
    />
  );
}
