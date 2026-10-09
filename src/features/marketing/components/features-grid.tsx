import { ExternalLink, SquareCheckBig } from "lucide-react";

import { cn } from "@/lib/cn";

import { isComingSoon } from "../feature-availability";
import {
  FEATURE_CARDS,
  FEATURES_SECTION,
  SECTION_IDS,
  type FeatureCard,
  type FeaturePreview,
} from "../home-content";
import { ComingSoonBadge, Section, SectionIntro } from "./section";

export function FeaturesGrid() {
  return (
    <Section id={SECTION_IDS.features} labelledBy="features-title">
      <SectionIntro headingId="features-title" {...FEATURES_SECTION} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {FEATURE_CARDS.map((card) => (
          <li key={card.feature}>
            <FeatureCardView card={card} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

function FeatureCardView({ card }: Readonly<{ card: FeatureCard }>) {
  const Icon = card.icon;
  const comingSoon = isComingSoon(card.feature);
  return (
    <article className="flex h-full flex-col justify-between gap-2.5 rounded-2xl border border-sand bg-white p-4 shadow-sm transition-shadow hover:shadow-md lg:gap-0 lg:rounded-3xl lg:p-6">
      <div>
        <div className="flex items-center justify-between gap-2 lg:mb-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sand text-burgundy lg:size-10">
            <Icon aria-hidden className="size-5" />
          </span>
          {comingSoon ? (
            <ComingSoonBadge feature={card.feature} />
          ) : (
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-semibold text-graphite lg:hidden">
              {card.tag}
            </span>
          )}
        </div>
        <h3 className="mt-2.5 font-serif text-[18px] font-semibold text-burgundy lg:mt-0 lg:mb-2 lg:font-sans lg:text-title-lg">
          {card.title}
        </h3>
        <p className="mt-2.5 text-body-sm text-plum lg:mt-0 lg:mb-6">{card.description}</p>
      </div>
      <FeaturePreviewView preview={card.preview} />
    </article>
  );
}

/** The small example row at the bottom of each card. */
function FeaturePreviewView({ preview }: Readonly<{ preview: FeaturePreview }>) {
  const box = "mt-1 rounded-xl border border-sand bg-ivory p-3 lg:mt-0";
  switch (preview.kind) {
    case "list":
      return (
        <dl className={cn(box, "space-y-2")}>
          {preview.items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-2 text-[12px] font-medium"
            >
              <dt className="text-graphite">{item.label}</dt>
              <dd className={item.emphasis ? "font-semibold text-burgundy" : "text-plum"}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "task":
      return (
        <div className={box}>
          <p className="flex items-center gap-2 text-body-sm text-graphite">
            <SquareCheckBig aria-hidden className="size-4 text-burgundy" />
            {preview.title}
          </p>
          <p className="mt-1.5 ml-6 text-label-sm text-plum">{preview.meta}</p>
        </div>
      );
    case "person":
      return (
        <div className={cn(box, "flex items-center justify-between gap-2")}>
          <div className="flex min-w-0 items-center gap-2">
            {preview.avatar && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-burgundy text-xs font-bold text-white">
                {preview.avatar}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-graphite">{preview.name}</p>
              {preview.meta && <p className="text-body-sm text-plum">{preview.meta}</p>}
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-sand bg-sand px-2 py-0.5 text-label-sm font-semibold text-burgundy">
            {preview.badge}
          </span>
        </div>
      );
    case "link":
      return (
        <p className={cn(box, "flex items-center justify-between gap-2 text-[12px] text-plum")}>
          <span className="truncate">{preview.text}</span>
          <ExternalLink aria-hidden className="size-4 shrink-0" />
        </p>
      );
  }
}
