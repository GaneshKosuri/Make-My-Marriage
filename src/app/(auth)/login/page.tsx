import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/login-form";

import { RedirectIfSignedIn } from "../redirect-if-signed-in";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <RedirectIfSignedIn />
      <LoginForm />
    </>
  );
}
