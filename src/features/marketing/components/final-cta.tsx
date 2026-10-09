import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";

import { FINAL_CTA, ROUTES, SECTION_IDS } from "../home-content";
import { ctaVariants } from "./cta";
import { CONTAINER, Eyebrow } from "./section";

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-title"
      className="w-full border-t border-ivory/10 bg-burgundy-deep py-12 text-ivory md:py-20 lg:py-24"
    >
      <div className={CONTAINER}>
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:items-center sm:text-center">
          <Eyebrow icon={FINAL_CTA.icon} tone="dark" className="lg:mb-1">
            {FINAL_CTA.eyebrow}
          </Eyebrow>
          <h2
            id="final-cta-title"
            className="font-serif text-headline-sm tracking-tight lg:text-headline-lg"
          >
            {FINAL_CTA.title}
          </h2>
          <p className="max-w-xl text-body-md text-ivory/80 lg:text-body-lg lg:text-sand">
            {FINAL_CTA.text}
          </p>
          <div className="mt-3 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-4 lg:mt-5">
            <Link href={ROUTES.signUp} className={ctaVariants({ variant: "light", size: "large" })}>
              {FINAL_CTA.primary}
              <ArrowRight aria-hidden className="sm:hidden" />
            </Link>
            <a
              href={`#${SECTION_IDS.features}`}
              className={ctaVariants({ variant: "onDark", size: "large" })}
            >
              {FINAL_CTA.secondary}
              <Compass aria-hidden className="sm:hidden" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
