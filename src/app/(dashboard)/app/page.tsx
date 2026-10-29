import type { Metadata } from "next";
import { Suspense } from "react";

import {
  DashboardScreen,
  DashboardSkeleton,
} from "@/features/dashboard/components/dashboard-screen";
import { dateOnlyInTimeZone, daysUntil } from "@/lib/dates";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * /app — the wedding dashboard (PRD §9.3). The layout's guard has already
 * checked the session and membership; the numbers load from GET /api/dashboard.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.wedding || !current.membership) return null;
  const { wedding } = current;
  const now = new Date();

  return (
    <DashboardScreen
      wedding={wedding}
      role={current.membership.role}
      daysRemaining={daysUntil(wedding.weddingDate, wedding.timeZone, now)}
      today={dateOnlyInTimeZone(now, wedding.timeZone)}
    />
  );
}
