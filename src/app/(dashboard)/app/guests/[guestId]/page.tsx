import type { Metadata } from "next";
import { Suspense } from "react";

import { GuestDetailScreen } from "@/features/guests/components/guest-detail-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Guest" };

/** /app/guests/[guestId] (PRD §9.7–9.11): one guest, with edit and delete. */
export default function GuestDetailPage({ params }: PageProps<"/app/guests/[guestId]">) {
  return (
    <Suspense fallback={null}>
      <GuestDetail params={params} />
    </Suspense>
  );
}

async function GuestDetail({ params }: Pick<PageProps<"/app/guests/[guestId]">, "params">) {
  // Memoised per request: the layout's guard made the same call.
  const [current, { guestId }] = await Promise.all([getCurrentContext(), params]);
  if (!current?.wedding) return null;
  return <GuestDetailScreen guestId={guestId} timeZone={current.wedding.timeZone} />;
}
