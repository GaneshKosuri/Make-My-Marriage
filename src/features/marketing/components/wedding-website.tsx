import { MonitorPlay } from "lucide-react";

import { cn } from "@/lib/cn";
import { WEBSITE_THEME_LABELS } from "@/modules/weddings/wedding.constants";

import { WEBSITE } from "../home-content";
import { ComingSoonBadge, Section, SectionIntro } from "./section";

export function WeddingWebsite() {
  return (
    <Section tone="sand" labelledBy="website-title">
      <SectionIntro
        headingId="website-title"
        tone="sand"
        eyebrow={WEBSITE.eyebrow}
        icon={WEBSITE.icon}
        title={WEBSITE.title}
        intro={WEBSITE.intro}
        badge={<ComingSoonBadge feature="website" tone="white" />}
      />

      <ul className="mb-3 grid gap-3 md:grid-cols-3 lg:mb-12 lg:gap-6">
        {WEBSITE.themes.map((theme, index) => (
          <li
            key={theme.theme}
            className="flex items-center gap-3 rounded-xl border border-sand bg-white p-3.5 shadow-sm md:flex-col md:items-stretch md:gap-0 md:rounded-3xl md:p-6"
          >
            {/* Phones: initials; from md: a small preview of the theme */}
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] font-bold text-burgundy md:hidden">
              {theme.initials}
            </span>
            <div
              aria-hidden
              className={cn(
                "mb-5 hidden h-36 flex-col justify-between rounded-2xl border border-sand p-4 md:flex",
                index === 1 ? "bg-sand" : "bg-ivory",
              )}
            >
              <span className="text-eyebrow text-gold-deep uppercase">
                Theme {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "text-[20px] font-semibold",
                  index === 1 ? "font-sans text-[18px] text-graphite" : "font-serif text-burgundy",
                )}
              >
                {theme.sample}
              </span>
              <span className="text-label-sm text-plum">{theme.style}</span>
            </div>
            <div>
              <h3 className="font-serif text-[14px] font-semibold text-burgundy md:mb-1 md:font-sans md:text-title-lg">
                {WEBSITE_THEME_LABELS[theme.theme]}
              </h3>
              <p className="text-body-sm text-plum">{theme.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm lg:rounded-3xl lg:p-8">
        <div className="flex items-center gap-3 lg:gap-4">
          <span className="flex shrink-0 items-center justify-center text-burgundy lg:size-12 lg:rounded-2xl lg:bg-sand">
            <MonitorPlay aria-hidden className="size-6" />
          </span>
          <div>
            <h3 className="font-serif text-[15px] font-semibold text-burgundy lg:font-sans lg:text-title-lg">
              {WEBSITE.livestream.title}
            </h3>
            <p className="mt-0.5 text-body-sm text-plum">{WEBSITE.livestream.text}</p>
          </div>
        </div>
        <ComingSoonBadge feature="livestream" />
      </div>
    </Section>
  );
}
