"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useLogout } from "../api";
import { AUTH_ROUTES, SIGN_OUT } from "../auth-content";

/**
 * Ends this session, then goes to sign-in. Unstyled: the onboarding screen
 * shows it as a link, the dashboard header as a button.
 */
export function SignOutButton({
  className,
  children = SIGN_OUT,
}: Readonly<{ className?: string; children?: ReactNode }>) {
  const router = useRouter();
  const logout = useLogout();
  return (
    <button
      type="button"
      disabled={logout.isPending}
      onClick={() =>
        logout.mutate(undefined, {
          // Already signed out on the server, or the session had expired: either way, leave.
          onSettled: () => router.replace(AUTH_ROUTES.signIn),
        })
      }
      className={className}
    >
      {children}
    </button>
  );
}
