import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/features/marketing/components/brand-logo";

import { AUTH_FOOTER, AUTH_SHOWCASE } from "../auth-content";

/**
 * Frame for every sign-in / sign-up / password screen (Stitch auth designs).
 * Desktop: sand brand panel (40%) + ivory form column. Phones: centred logo,
 * then the form. One footer, under the form column only.
 */
export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-ivory text-graphite lg:grid lg:grid-cols-[2fr_3fr]">
      <aside className="hidden flex-col border-r border-sand bg-sand px-12 py-12 lg:flex xl:px-16">
        <BrandLogo />
        <div className="my-auto max-w-md">
          <p className="text-eyebrow text-gold-deep uppercase">{AUTH_SHOWCASE.eyebrow}</p>
          <p className="mt-3 font-serif text-headline-lg">{AUTH_SHOWCASE.couple}</p>
          <p className="mt-2 text-body-md text-plum">{AUTH_SHOWCASE.details}</p>
          <hr className="my-6 border-graphite/10" />
          <p className="text-body-lg text-plum">{AUTH_SHOWCASE.tagline}</p>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
        <MobileBrand />
        <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
          {children}
        </main>
        <footer className="mx-auto mt-10 w-full max-w-[440px] text-center text-body-sm text-plum lg:text-left">
          {AUTH_FOOTER}
        </footer>
      </div>
    </div>
  );
}

function MobileBrand() {
  return (
    <Link
      href="/"
      aria-label="Make My Marriage home"
      className="mx-auto mb-6 flex flex-col items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy lg:hidden"
    >
      <Image src="/brand/logo-mark.svg" alt="" width={48} height={48} className="size-12" />
      <span className="text-eyebrow text-gold-deep uppercase">The wedding workspace</span>
      <span className="font-serif text-headline-sm text-graphite">Make My Marriage</span>
    </Link>
  );
}

/** White card holding a screen's heading and form. */
export function AuthCard({
  eyebrow,
  title,
  description,
  aside,
  icon,
  centered = false,
  children,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Top-right slot beside the heading, e.g. "Already coordinating? Sign in". */
  aside?: ReactNode;
  /** Round badge above the heading for status screens (sent, expired, updated). */
  icon?: ReactNode;
  centered?: boolean;
  children?: ReactNode;
}>) {
  return (
    <section className="rounded-3xl border border-sand bg-white p-6 shadow-[0_2px_8px_-2px_rgba(43,35,38,0.04),0_1px_3px_0_rgba(43,35,38,0.02)] sm:p-8">
      <header className={centered ? "flex flex-col items-center text-center" : undefined}>
        {icon && (
          <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-sand text-burgundy [&_svg]:size-6">
            {icon}
          </span>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow && <p className="mb-2 text-eyebrow text-gold-deep uppercase">{eyebrow}</p>}
            <h1 className="font-serif text-headline-md text-graphite sm:text-headline-lg">
              {title}
            </h1>
          </div>
          {aside}
        </div>
        {description && <p className="mt-2 text-body-md text-plum">{description}</p>}
      </header>
      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}

/** Sand note under a card (guest note, reset-link rules). */
export function AuthNote({
  icon,
  title,
  children,
}: Readonly<{ icon: ReactNode; title?: string; children: ReactNode }>) {
  return (
    <aside className="mt-4 flex gap-3 rounded-2xl bg-sand p-4 text-body-sm text-plum [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gold-deep">
      {icon}
      <div>
        {title && <p className="mb-1 text-label-md text-graphite">{title}</p>}
        {children}
      </div>
    </aside>
  );
}
