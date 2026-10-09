import Link from "next/link";

import { FOOTER } from "../home-content";
import { BrandLogo } from "./brand-logo";
import { CONTAINER } from "./section";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-ivory/10 bg-burgundy-deep text-ivory">
      <div className={`${CONTAINER} pt-10 pb-6`}>
        <div className="grid gap-6 border-b border-ivory/10 pb-8 md:grid-cols-12 lg:pb-10">
          <div className="flex flex-col items-start gap-3 md:col-span-5">
            <BrandLogo tone="dark" />
            <p className="max-w-sm text-body-sm text-ivory/70 lg:text-body-lg lg:text-sand">
              {FOOTER.description}
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-6 md:col-span-7 md:grid-cols-3">
            {FOOTER.columns.map((column) => (
              <div key={column.title} className="flex flex-col gap-2">
                <h2 className="text-eyebrow text-gold-light uppercase">{column.title}</h2>
                <ul className="flex flex-col gap-2 lg:gap-1">
                  {column.links.map((link) => {
                    const className =
                      "rounded text-body-sm text-ivory/80 transition-colors hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory lg:text-body-md lg:text-sand";
                    return (
                      <li key={link.href}>
                        {link.href.startsWith("#") ? (
                          <a href={link.href} className={className}>
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className={className}>
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="pt-6 text-center text-body-sm text-ivory/65 sm:text-left lg:text-sand">
          {FOOTER.copyright}
        </p>
      </div>
    </footer>
  );
}
