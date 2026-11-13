import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import type { CurrentContext } from "@/server/auth";

import { readSessionSafely } from "./read-session-safely";

/**
 * Where a signed-in person belongs: their wedding's dashboard (what they see
 * there follows their role), or Create Wedding when they have none yet.
 */
export function workspacePathFor(current: CurrentContext): string {
  return current.membership ? "/app" : "/create-wedding";
}

/**
 * For pages only signed-out visitors should see (the home page): a signed-in
 * visitor is sent to their workspace before any of the page renders, so it
 * never flashes. The session is read per request inside <Suspense> (Cache
 * Components); without a session cookie that needs no database. If the
 * session cannot be checked, the page simply renders.
 */
export function SignedOutOnly({ page, children }: Readonly<{ page: string; children: ReactNode }>) {
  return (
    <Suspense fallback={null}>
      <SignedOutGate page={page}>{children}</SignedOutGate>
    </Suspense>
  );
}

/** Exported for tests. */
export async function SignedOutGate({
  page,
  children,
}: Readonly<{ page: string; children: ReactNode }>) {
  const current = await readSessionSafely(page);
  // redirect() throws to unwind rendering, so it stays outside any try/catch.
  if (current) redirect(workspacePathFor(current));
  return children;
}

/**
 * Sends a signed-in visitor of /login or /signup on to their workspace. Unlike
 * SignedOutOnly it renders nothing itself, so the form stays prerendered.
 */
export function RedirectIfSignedIn({ page }: Readonly<{ page: string }>) {
  return (
    <Suspense fallback={null}>
      <SignedOutGate page={page}>{null}</SignedOutGate>
    </Suspense>
  );
}
