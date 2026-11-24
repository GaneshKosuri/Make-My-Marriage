import type { Metadata } from "next";

import { LivestreamScreen } from "@/features/livestream/components/livestream-screen";

export const metadata: Metadata = { title: "Livestream" };

/** /app/livestream (PRD §9.24): the YouTube livestream shown on the wedding website. */
export default function LivestreamPage() {
  return <LivestreamScreen />;
}
