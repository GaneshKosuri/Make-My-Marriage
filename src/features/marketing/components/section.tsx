import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { isComingSoon, type ProductFeature } from "../feature-availability";

/**
 * Layout primitives shared by the home page sections. Phone layouts follow
 * Stitch "Home Screen - Mobile"; from `lg` they follow "Home Screen - Desktop".
 */

export type SectionTone = "ivory" | "sand" | "dark";

const TONE_CLASSES: Record<SectionTone, string> = {
  ivory: "bg-ivory",
  sand: "bg-sand",
  dark: "bg-burgundy-deep text-ivory",
};

/** The page's content width: 1440px max, 16px gutters on phones, 48px from md. */
export const CONTAINER = "mx-auto w-full max-w-[1440px] px-4 md:px-12";

export function Section({
  id,
  tone = "ivory",
  labelledBy,
  className,
  children,
}: Readonly<{
  id?: string;
  tone?: SectionTone;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}>) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "w-full scroll-mt-16 py-10 md:py-20 lg:scroll-mt-20 lg:py-24",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <div className={CONTAINER}>{children}</div>
    </section>
  );
}

/** Section label: a gold pill with an icon on phones, plain gold caps from `lg`. */
export function Eyebrow({
  icon: Icon,
  tone = "ivory",
  className,
  children,
}: Readonly<{ icon: LucideIcon; tone?: SectionTone; className?: string; children: ReactNode }>) {
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-eyebrow uppercase",
        "lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:tracking-[0.12em]",
        tone === "dark" && "border-ivory/15 bg-ivory/10 text-gold-light",
        tone === "sand" && "border-sand bg-ivory text-gold-deep",
        tone === "ivory" && "border-sand bg-sand text-gold-deep",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 lg:hidden" />
      {children}
    </p>
  );
}

export function SectionIntro({
  headingId,
  eyebrow,
  icon,
  title,
  intro,
  tone = "ivory",
  badge,
  className,
}: Readonly<{
  headingId: string;
  eyebrow: string;
  icon: LucideIcon;
  title: ReactNode;
  intro?: string;
  tone?: SectionTone;
  /** Rendered next to the eyebrow, e.g. a <ComingSoonBadge />. */
  badge?: ReactNode;
  className?: string;
}>) {
  const dark = tone === "dark";
  return (
    <div className={cn("mb-6 flex max-w-2xl flex-col gap-2 lg:mb-14", className)}>
      <div className="flex flex-wrap items-center gap-3 lg:mb-1">
        <Eyebrow icon={icon} tone={tone}>
          {eyebrow}
        </Eyebrow>
        {badge}
      </div>
      <h2
        id={headingId}
        className={cn(
          "font-serif text-headline-sm tracking-tight lg:text-headline-lg",
          dark ? "text-ivory" : "text-burgundy",
        )}
      >
        {title}
      </h2>
      {intro && (
        <p
          className={cn(
            "text-body-md lg:mt-2 lg:text-body-lg",
            dark ? "text-ivory/80 lg:text-sand" : "text-plum",
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}

/** Rendered only while `feature` is not live (./feature-availability.ts). */
export function ComingSoonBadge({
  feature,
  tone = "sand",
  className,
}: Readonly<{ feature: ProductFeature; tone?: "sand" | "white"; className?: string }>) {
  if (!isComingSoon(feature)) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-sand px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-burgundy uppercase tracking-wider lg:text-[11px]",
        tone === "white" ? "bg-white" : "bg-sand",
        className,
      )}
    >
      Coming soon
    </span>
  );
}
