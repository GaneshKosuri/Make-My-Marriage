import type { Metadata } from "next";
import { Suspense } from "react";

import { MembersScreen } from "@/features/members/components/members-screen";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Wedding Members" };

/**
 * Settings → Wedding Members (PRD §9.4). Admins manage members; Managers see
 * the list read-only (decided 2026-10-29). Every mutation is `auth: "admin"`
 * in the API regardless of what this page shows.
 */
export default function MembersPage() {
  return (
    <Suspense fallback={null}>
      <Members />
    </Suspense>
  );
}

async function Members() {
  // Memoised per request: the layout's guard made the same call.
  const current = await getCurrentContext();
  if (!current?.membership || !current.wedding) return null;
  return (
    <MembersScreen
      role={current.membership.role}
      currentMembershipId={current.membership.membershipId}
      timeZone={current.wedding.timeZone}
    />
  );
}
