import type { ReactNode } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";

/** Sign-in, sign-up and password reset: brand panel + form column. */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthShell>{children}</AuthShell>;
}
