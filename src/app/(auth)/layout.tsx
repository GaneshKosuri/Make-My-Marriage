import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

/** Centered card layout for sign-in, sign-up and password reset. */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted px-4 py-12">
      <Link href="/" aria-label="Make My Marriage home">
        <Image
          src="/brand/logo-horizontal.svg"
          alt="Make My Marriage"
          width={572}
          height={96}
          className="h-auto w-56"
        />
      </Link>
      <Card className="w-full max-w-md">
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
