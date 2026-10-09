import { PRIVACY, SECTION_IDS } from "../home-content";
import { Section, SectionIntro } from "./section";

export function Privacy() {
  return (
    <Section id={SECTION_IDS.privacy} labelledBy="privacy-title">
      <SectionIntro
        headingId="privacy-title"
        eyebrow={PRIVACY.eyebrow}
        icon={PRIVACY.icon}
        title={PRIVACY.title}
        intro={PRIVACY.intro}
      />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {PRIVACY.points.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex flex-col gap-2 rounded-xl border border-sand bg-white p-3.5 shadow-sm lg:gap-0 lg:rounded-3xl lg:p-6"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-sand text-burgundy lg:mb-4 lg:size-10 lg:rounded-xl">
              <Icon aria-hidden className="size-[18px] lg:size-5" />
            </span>
            <h3 className="font-serif text-[14px] font-semibold text-burgundy lg:mb-2 lg:font-sans lg:text-title-lg">
              {title}
            </h3>
            <p className="text-body-sm text-plum">{text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
