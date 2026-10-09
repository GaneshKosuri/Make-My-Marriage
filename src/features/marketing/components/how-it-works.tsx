import { HOW_IT_WORKS, SECTION_IDS } from "../home-content";
import { Section, SectionIntro } from "./section";

export function HowItWorks() {
  return (
    <Section id={SECTION_IDS.howItWorks} tone="sand" labelledBy="how-it-works-title">
      <SectionIntro
        headingId="how-it-works-title"
        tone="sand"
        eyebrow={HOW_IT_WORKS.eyebrow}
        icon={HOW_IT_WORKS.icon}
        title={HOW_IT_WORKS.title}
        intro={HOW_IT_WORKS.intro}
      />
      <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {HOW_IT_WORKS.steps.map((step, index) => {
          const number = String(index + 1).padStart(2, "0");
          return (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-sand bg-white p-4 shadow-sm lg:flex-col lg:justify-between lg:gap-0 lg:rounded-3xl lg:p-6"
            >
              {/* Phones: a burgundy number badge */}
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-burgundy text-[12px] font-bold text-ivory lg:hidden"
              >
                {number}
              </span>
              <div className="flex flex-1 flex-col">
                <span aria-hidden className="mb-3 hidden text-metric text-gold lg:block">
                  {number}
                </span>
                <h3 className="font-serif text-[15px] font-semibold text-burgundy lg:mb-2 lg:font-sans lg:text-title-lg">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-0.5 text-body-sm text-plum lg:mt-0 lg:mb-6">{step.text}</p>
                {"note" in step && (
                  <p className="mt-2 border-t border-sand pt-2 text-[10px] font-bold tracking-wider text-gold-deep uppercase lg:mt-auto lg:pt-4 lg:text-[11px] lg:font-normal lg:tracking-normal lg:text-plum lg:normal-case">
                    {step.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
