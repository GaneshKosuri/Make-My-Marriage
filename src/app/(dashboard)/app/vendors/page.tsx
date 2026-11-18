import type { Metadata } from "next";
import { Suspense } from "react";

import { VendorsScreen } from "@/features/vendors/components/vendors-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "My Vendors" };

/**
 * /app/vendors (PRD §9.16): the vendors booked for the wedding. The screen
 * reads its filters and `?new=1` (open the add form) from the address itself,
 * so links keep working while it stays mounted.
 */
export default function VendorsPage() {
  return (
    <Suspense fallback={null}>
      <Vendors />
    </Suspense>
  );
}

async function Vendors() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  return <VendorsScreen timeZone={current.wedding.timeZone} />;
}
