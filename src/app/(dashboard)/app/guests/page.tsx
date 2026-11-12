import type { Metadata } from "next";
import { Suspense } from "react";

import { GuestsScreen } from "@/features/guests/components/guests-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Guest List" };

/**
 * /app/guests (PRD §9.7–9.8): the guest list with search and filters. The
 * screen reads its filters and `?new=1` (open the add form) from the address
 * itself, so links keep working while it stays mounted.
 */
export default function GuestsPage() {
  return (
    <Suspense fallback={null}>
      <Guests />
    </Suspense>
  );
}

async function Guests() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return <GuestsScreen timeZone={current.wedding.timeZone} />;
}
