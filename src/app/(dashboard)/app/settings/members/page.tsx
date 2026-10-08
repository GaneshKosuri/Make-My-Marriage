import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { getCurrentContext } from "@/server/auth";

export const metadata: Metadata = { title: "Wedding Members" };

/**
 * Settings → Wedding Members: ADMIN only (PRD §9.4). The nav hides the link from
 * Managers and every /api/members mutation is `auth: "admin"`; this page check
 * is a third layer.
 */
export default async function MembersPage() {
  const current = await getCurrentContext();
  if (current?.membership?.role !== "ADMIN") notFound();

  return (
    <PagePlaceholder
      title="Wedding Members"
      phase="Phase 1: Foundation"
      description="Invite family members, change roles and remove members. A wedding always keeps at least one Admin (PRD §9.4)."
    />
  );
}
