import { coupleDisplayName } from "@/lib/couple";
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

function countdownLabel(days: number): string {
  if (days > 1) return `${days} days to go`;
  if (days === 1) return "Tomorrow!";
  if (days === 0) return "Today!";
  return "Married";
}

/** Couple identity on every signed-in page (PRD §12.1) with the wedding countdown (PRD §9.3). */
export function WeddingHeader({ wedding, userName, role }: Readonly<WeddingHeaderProps>) {
  const days = daysUntil(wedding.weddingDate, wedding.timeZone);
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-4 md:px-8">
      <div>
        <p className="font-serif text-xl font-semibold">{coupleDisplayName(wedding)}</p>
        <p className="text-sm text-muted-foreground">
          {formatDateOnly(wedding.weddingDate)} · {countdownLabel(days)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {userName} · {MEMBER_ROLE_LABELS[role]}
      </p>
    </header>
  );
}
