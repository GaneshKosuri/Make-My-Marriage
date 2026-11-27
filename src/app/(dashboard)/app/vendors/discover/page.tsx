import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverScreen, DiscoverSkeleton } from "@/features/vendors/components/discover-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Discover Vendors" };

/**
 * /app/vendors/discover (PRD §9.17): find vendors on Google near the wedding's
 * city (editable) and add them to My Vendors after checking the details.
 */
export default function DiscoverVendorsPage() {
  return (
    <Suspense fallback={<DiscoverSkeleton />}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding) return null;
  const { city, state, timeZone } = current.wedding;
  const near = [city, state].filter(Boolean).join(", ") || null;
  return <DiscoverScreen defaultNear={near} timeZone={timeZone} />;
}
