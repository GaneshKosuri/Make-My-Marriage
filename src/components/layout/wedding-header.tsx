import { LogOut } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SIGN_OUT } from "@/features/auth/auth-content";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { coupleDisplayName, weddingCountdownLabel } from "@/lib/couple";
import { daysUntil, formatDateOnly } from "@/lib/dates";
import type { MemberRole } from "@/modules/members/member.constants";
import { MEMBER_ROLE_LABELS } from "@/modules/members/member.constants";

export interface WeddingHeaderProps {
  wedding: {
    brideName: string;
    groomName: string;
    title: string | null;
    weddingDate: string;
    timeZone: string;
  };
  userName: string;
  role: MemberRole;
}

/** Couple identity on every signed-in page (PRD §12.1) with the wedding countdown (PRD §9.3). */
export function WeddingHeader({ wedding, userName, role }: Readonly<WeddingHeaderProps>) {
  const days = daysUntil(wedding.weddingDate, wedding.timeZone);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 md:px-8">
      <div>
        <p className="font-serif text-xl font-semibold">{coupleDisplayName(wedding)}</p>
        <p className="text-sm text-muted-foreground">
          {formatDateOnly(wedding.weddingDate)} · {weddingCountdownLabel(days)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {userName} · {MEMBER_ROLE_LABELS[role]}
        </p>
        <SignOutButton className={buttonVariants({ variant: "outline", size: "sm" })}>
          <LogOut aria-hidden="true" />
          {SIGN_OUT}
        </SignOutButton>
      </div>
    </header>
  );
}
