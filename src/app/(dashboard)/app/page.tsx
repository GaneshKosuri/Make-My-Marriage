import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      phase="Phase 1: Foundation"
      description="Countdown, events, tasks, guests, RSVPs, expenses and vendors at a glance (PRD §9.3)."
    />
  );
}
