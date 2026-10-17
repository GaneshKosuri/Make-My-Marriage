import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CreateWeddingScreen } from "@/features/weddings/components/create-wedding-screen";

import { readSessionSafely } from "../../read-session-safely";

export const metadata: Metadata = {
  title: "Create your wedding",
  robots: { index: false, follow: false },
};

/**
 * /create-wedding — signed-in users without a wedding (PRD §9.2). The session
 * is read per request, inside <Suspense> (Cache Components).
 */
export default function CreateWeddingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-ivory" aria-busy="true" />}>
      <GuardedCreateWedding />
    </Suspense>
  );
}

async function GuardedCreateWedding() {
  // A session that cannot be checked counts as signed out: /login renders
  // without the database, so this never crashes. redirect() stays outside try/catch.
  const current = await readSessionSafely("create-wedding");
  if (!current) redirect("/login");
  if (current.membership) redirect("/app");
  return <CreateWeddingScreen userName={current.user.name} />;
}
