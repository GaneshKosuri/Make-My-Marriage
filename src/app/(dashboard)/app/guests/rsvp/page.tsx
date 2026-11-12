import type { Metadata } from "next";
import { Suspense } from "react";

import { RsvpScreen } from "@/features/guests/components/rsvp-screen";

export const metadata: Metadata = { title: "RSVP" };

/** /app/guests/rsvp (PRD §9.11, §9.13): replies at a glance and guests by reply. */
export default function RsvpPage() {
  return (
    <Suspense fallback={null}>
      <RsvpScreen />
    </Suspense>
  );
}
