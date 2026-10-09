import { ArrowRight, CirclePlay } from "lucide-react";
import Link from "next/link";

import { HERO, ROUTES, SECTION_IDS } from "../home-content";
import { ctaVariants } from "./cta";
import { CONTAINER, Eyebrow } from "./section";
import { WorkspacePreview, WorkspacePreviewCompact } from "./workspace-preview";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-ivory">
      <div className={`${CONTAINER} pt-4 pb-10 md:py-16 xl:py-24`}>
        <div className="grid items-center gap-6 md:gap-12 xl:grid-cols-12">
          <div className="flex flex-col items-start xl:col-span-6">
            <Eyebrow icon={HERO.icon}>{HERO.eyebrow}</Eyebrow>
            <h1
              id="hero-title"
              className="mt-3 font-serif text-[26px]/[34px] font-semibold tracking-tight text-burgundy sm:text-[32px]/[40px] lg:mt-4 lg:text-display"
            >
              <span className="lg:block">{HERO.titleLines[0]}</span>{" "}
              <span className="lg:block">{HERO.titleLines[1]}</span>
            </h1>
            <p className="mt-3 max-w-xl text-body-md text-plum lg:mt-6 lg:text-body-lg">
              {HERO.intro}
            </p>

            <div className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-4 lg:mt-8">
              <Link href={ROUTES.signUp} className={ctaVariants()}>
                {HERO.primaryCta}
                <ArrowRight aria-hidden className="sm:hidden" />
              </Link>
              <a
                href={`#${SECTION_IDS.howItWorks}`}
                className={ctaVariants({ variant: "secondary" })}
              >
                {HERO.secondaryCta}
                <CirclePlay aria-hidden className="sm:hidden" />
              </a>
            </div>

            <p className="mt-3 flex w-full items-center justify-center gap-2 text-[11px] text-plum sm:justify-start lg:mt-8 lg:text-body-sm">
              <span className="size-1.5 shrink-0 rounded-full bg-gold lg:size-2" />
              {HERO.note}
            </p>
          </div>

          <div className="xl:col-span-6">
            <WorkspacePreviewCompact className="md:hidden" />
            <WorkspacePreview className="mx-auto hidden max-w-2xl md:block xl:max-w-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
