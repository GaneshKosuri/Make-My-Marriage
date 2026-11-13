import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

import { RedirectIfSignedIn } from "../../signed-in-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <RedirectIfSignedIn page="login" />
      <LoginForm />
    </>
  );
}
