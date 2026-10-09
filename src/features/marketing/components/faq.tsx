import { ChevronDown } from "lucide-react";

import { upcomingFeaturesSentence } from "../feature-availability";
import { FAQ } from "../home-content";
import { Section, SectionIntro } from "./section";

/**
 * Native <details> accordion: no client JavaScript, keyboard accessible, and
 * the shared `name` lets only one answer stay open at a time.
 */
export function Faq() {
  const upcoming = upcomingFeaturesSentence();
  const items = upcoming
    ? [...FAQ.items, { question: FAQ.upcomingQuestion, answer: upcoming }]
    : FAQ.items;

  return (
    <Section labelledBy="faq-title">
      <SectionIntro
        headingId="faq-title"
        eyebrow={FAQ.eyebrow}
        icon={FAQ.icon}
        title={FAQ.title}
        intro={FAQ.intro}
      />
      <div className="flex max-w-3xl flex-col gap-2.5 lg:gap-4">
        {items.map((item, index) => (
          <details
            key={item.question}
            name="home-faq"
            open={index === 0}
            className="group rounded-xl border border-sand bg-white p-3.5 shadow-sm lg:rounded-2xl lg:p-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy [&::-webkit-details-marker]:hidden">
              <h3 className="font-serif text-[15px] font-semibold text-burgundy lg:font-sans lg:text-title-md">
                {item.question}
              </h3>
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 text-burgundy transition-transform group-open:rotate-180 lg:text-plum"
              />
            </summary>
            <p className="mt-2 border-t border-sand pt-2 text-body-sm text-plum lg:mt-4 lg:pt-4 lg:text-body-md">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}
