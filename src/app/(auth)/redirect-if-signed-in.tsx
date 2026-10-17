import { redirect } from "next/navigation";
import { Suspense } from "react";

import { readSessionSafely } from "../read-session-safely";

/**
 * Sends a signed-in visitor of /login or /signup on to their workspace. Read
 * per request inside <Suspense>, so the form itself stays prerendered. If the
 * session cannot be checked, the form simply renders.
 */
export function RedirectIfSignedIn() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}

async function Redirect() {
  const current = await readSessionSafely("auth");
  // redirect() throws to unwind rendering, so it stays outside any try/catch.
  if (current) redirect(current.membership ? "/app" : "/create-wedding");
  return null;
}
