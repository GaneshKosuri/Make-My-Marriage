import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

export const textLink = cn(
  "inline-flex items-center gap-1.5 rounded text-label-md text-burgundy underline-offset-4 hover:underline",
  focusRing,
);

export const primaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-label-md text-ivory hover:bg-burgundy-deep",
  focusRing,
);

/** White dashboard panel with a serif heading and optional actions on the right. */
export function DashboardCard({
  title,
  description,
  actions,
  children,
  className,
}: Readonly<{
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-3xl border border-sand bg-white p-5 shadow-sm md:p-7", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-serif text-headline-sm text-graphite">{title}</h2>
          {description && <p className="text-body-md text-plum">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** "All events →" style link. */
export function ArrowLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link href={href} className={textLink}>
      {children}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

/** A friendly empty state with one next action (PRD §12: simple enough for parents). */
export function EmptyState({
  title,
  description,
  action,
}: Readonly<{ title: string; description: string; action: { label: string; href: string } }>) {
  return (
    <div className="rounded-2xl border border-dashed border-sand bg-ivory px-5 py-8 text-center">
      <p className="font-serif text-title-lg text-graphite">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{description}</p>
      <Link href={action.href} className={cn(primaryButton, "mt-4")}>
        {action.label}
      </Link>
    </div>
  );
}
