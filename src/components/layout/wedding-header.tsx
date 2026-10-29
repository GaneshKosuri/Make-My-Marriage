import Image from "next/image";
import Link from "next/link";

import {
  coupleDisplayName,
  weddingCountdownLabel,
  weddingPlace,
  type CoupleWedding,
} from "@/lib/couple";
import { daysUntil, formatDateOnly } from "@/lib/dates";

import { QuickAdd } from "./quick-add";
import { UserAvatar } from "./user-avatar";

export interface WeddingHeaderProps {
  wedding: CoupleWedding;
  userName: string;
}

/**
 * Couple identity on every signed-in page (PRD §12.1). Desktop: couple, date
 * and place with "+ Add". Phones: logo and couple; AppShell adds the floating
 * "+" outside this header so its sheet can cover the bottom bar. Sign out lives
 * in the sidebar and in the phone's "More" sheet.
 *
 * No backdrop-filter here: it would become the containing block of the
 * position:fixed menu backdrop, pinning it to the header.
 */
export function WeddingHeader({ wedding, userName }: Readonly<WeddingHeaderProps>) {
  const couple = coupleDisplayName(wedding);
  const place = weddingPlace(wedding);

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-ivory">
      <div className="hidden items-center justify-between gap-4 px-8 py-4 md:flex">
        <div className="min-w-0">
          <p className="truncate font-serif text-headline-sm text-graphite">{couple}</p>
          <p className="truncate text-body-md text-plum">
            {formatDateOnly(wedding.weddingDate)}
            {place && ` · ${place}`}
          </p>
        </div>
        <QuickAdd variant="button" subtitle={quickAddSubtitle(wedding)} />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
        <Link
          href="/app"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Image src="/brand/logo-mark.svg" alt="" width={40} height={40} className="size-10" />
          <span className="min-w-0">
            <span className="block text-eyebrow text-gold-deep uppercase">Make My Marriage</span>
            <span className="block truncate font-serif text-title-lg text-graphite">{couple}</span>
          </span>
        </Link>
        <span className="flex items-center gap-2">
          <span className="sr-only">Signed in as {userName}</span>
          <UserAvatar name={userName} />
        </span>
      </div>
    </header>
  );
}

/** Eyebrow of the "Add to your wedding" menu: "Akshay & Princi · 42 days to go". */
export function quickAddSubtitle(wedding: CoupleWedding): string {
  return `${coupleDisplayName(wedding)} · ${weddingCountdownLabel(
    daysUntil(wedding.weddingDate, wedding.timeZone),
  )}`;
}
