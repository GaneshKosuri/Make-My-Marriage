import Link from "next/link";

import { NAV_LINKS, ROUTES } from "../home-content";
import { BrandLogo } from "./brand-logo";
import { ctaVariants } from "./cta";
import { MobileMenu } from "./mobile-menu";
import { CONTAINER } from "./section";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-sand bg-ivory/90 shadow-[0_1px_8px_rgba(43,35,38,0.04)] backdrop-blur-xl">
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-4 lg:h-20`}>
        <BrandLogo />

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded text-body-md text-plum transition-colors hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={ROUTES.signIn}
            className="hidden rounded text-title-md text-plum transition-colors hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy sm:inline-block"
          >
            Sign in
          </Link>
          <MobileMenu
            links={NAV_LINKS}
            signIn={{ label: "Sign in", href: ROUTES.signIn }}
            className="lg:hidden"
          />
          <Link href={ROUTES.signUp} className={ctaVariants({ size: "compact" })}>
            Start planning
          </Link>
        </div>
      </div>
    </header>
  );
}
