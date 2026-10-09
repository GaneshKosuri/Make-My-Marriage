import { ArrowDown, ArrowRight, BadgeCheck, X } from "lucide-react";

import { TRANSFORMATION } from "../home-content";
import { Section, SectionIntro } from "./section";

// Slight, varied tilts make the "before" cards feel scattered (desktop only).
const TILTS = [
  "-rotate-1",
  "rotate-[1.5deg]",
  "-rotate-2",
  "rotate-1",
  "-rotate-[0.5deg]",
  "rotate-2",
];

const { solution } = TRANSFORMATION;

export function Transformation() {
  return (
    <Section tone="sand" labelledBy="transformation-title">
      <SectionIntro
        headingId="transformation-title"
        tone="sand"
        eyebrow={TRANSFORMATION.eyebrow}
        icon={TRANSFORMATION.icon}
        title={TRANSFORMATION.title}
        intro={TRANSFORMATION.intro}
      />

      {/* Phones and tablets */}
      <div className="flex flex-col gap-6 lg:hidden">
        <ul className="flex flex-col gap-2">
          {TRANSFORMATION.scatteredCompact.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 rounded-xl border border-sand bg-white p-3 shadow-sm"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sand/70 text-plum">
                <X aria-hidden className="size-4" />
              </span>
              <span className="text-[13px] font-medium text-graphite">{item}</span>
            </li>
          ))}
        </ul>
        <div className="-my-2 flex justify-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-burgundy text-ivory shadow-md">
            <ArrowDown aria-hidden className="size-[18px]" />
            <span className="sr-only">{TRANSFORMATION.unifiedLabel}</span>
          </span>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl bg-burgundy-deep p-5 text-ivory shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-wider text-gold-light uppercase">
              {solution.name}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
              {solution.tagline}
            </span>
          </div>
          <h3 className="font-serif text-[22px]/[28px] font-semibold">{solution.title}</h3>
          <p className="text-body-sm text-ivory/80">{solution.text}</p>
          <ul className="grid grid-cols-2 gap-2 pt-2">
            {solution.highlights.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex flex-col gap-1 rounded-xl border border-white/10 bg-burgundy/80 p-2.5"
              >
                <Icon aria-hidden className="size-[18px] text-gold-light" />
                <span className="text-body-sm font-semibold">{title}</span>
                <span className="text-[11px] text-ivory/75">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden items-center gap-8 lg:grid lg:grid-cols-12">
        <ul className="grid grid-cols-2 gap-3.5 lg:col-span-5">
          {TRANSFORMATION.scattered.map((item, index) => (
            <li
              key={item.source}
              className={`rounded-2xl border border-sand bg-white p-4 shadow-sm transition-transform hover:rotate-0 ${TILTS[index % TILTS.length]}`}
            >
              <div className="mb-2 flex items-center justify-between text-label-sm text-plum">
                <span>{item.source}</span>
                <X aria-hidden className="size-4" />
              </div>
              <p className="text-body-sm font-medium text-graphite">&ldquo;{item.quote}&rdquo;</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center justify-center lg:col-span-2">
          <span className="rounded-full border border-sand bg-white px-3.5 py-1.5 text-eyebrow whitespace-nowrap text-burgundy uppercase shadow-sm">
            {TRANSFORMATION.unifiedLabel}
          </span>
          <ArrowRight aria-hidden className="mt-2 size-8 text-burgundy" />
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-sand/20 bg-burgundy-deep p-8 text-ivory shadow-2xl lg:col-span-5">
          <div className="mb-6 flex items-center justify-between border-b border-ivory/10 pb-6">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border border-gold/30 bg-burgundy font-bold">
                M
              </span>
              <div>
                <h3 className="text-title-lg">{solution.name}</h3>
                <p className="text-label-sm text-gold-light">{solution.tagline}</p>
              </div>
            </div>
            <BadgeCheck aria-hidden className="size-6 text-gold-light" />
          </div>
          <ul className="space-y-3 text-body-md">
            {solution.points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl bg-ivory/10 p-3">
                <Icon aria-hidden className="size-5 shrink-0 text-gold-light" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
