import Image from "next/image";
import type { ReactNode } from "react";

/** Onboarding frame: create a wedding, or join one from a member invitation. */
export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12">
      <Image
        src="/brand/logo-horizontal.svg"
        alt="Make My Marriage"
        width={572}
        height={96}
        className="h-auto w-56"
      />
      <main>{children}</main>
    </div>
  );
}
