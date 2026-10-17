import type { Metadata } from "next";

import { SignupForm } from "@/features/auth/components/signup-form";

import { RedirectIfSignedIn } from "../redirect-if-signed-in";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <>
      <RedirectIfSignedIn />
      <SignupForm />
    </>
  );
}
