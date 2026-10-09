import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/cn";

import { BRAND } from "../home-content";

/** Logo mark (brand/logo-mark.svg) + wordmark + gold tagline. */
export function BrandLogo({
  tone = "light",
  className,
}: Readonly<{ tone?: "light" | "dark"; className?: string }>) {
  const dark = tone === "dark";
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4",
        dark ? "focus-visible:outline-ivory" : "focus-visible:outline-burgundy",
        className,
      )}
    >
      <Image
        src="/brand/logo-mark.svg"
        alt=""
        width={40}
        height={40}
        className={cn("size-9 lg:size-10", dark && "rounded-[25%] ring-1 ring-ivory/20")}
      />
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            "font-serif text-[19px] leading-tight font-semibold tracking-tight lg:text-headline-sm lg:leading-none",
            dark ? "text-ivory" : "text-burgundy",
          )}
        >
          {BRAND.name}
        </span>
        <span
          className={cn(
            "text-[9.5px] leading-none font-bold uppercase tracking-[0.1em] lg:text-eyebrow lg:leading-none",
            dark ? "text-gold-light" : "text-gold-deep",
          )}
        >
          {BRAND.tagline}
        </span>
      </span>
    </Link>
  );
}
