import { Check, X } from "lucide-react";

import { cn } from "@/lib/cn";

import { CEREMONIES, CEREMONIES_SECTION, INVITATION_MAPPING, SECTION_IDS } from "../home-content";
import { Section, SectionIntro } from "./section";

export function Ceremonies() {
  return (
    <Section id={SECTION_IDS.events} labelledBy="ceremonies-title">
      <SectionIntro headingId="ceremonies-title" {...CEREMONIES_SECTION} />

      <ol className="flex flex-col gap-2.5 lg:mb-12 lg:grid lg:grid-cols-4 lg:gap-4 xl:grid-cols-7">
        {CEREMONIES.map((ceremony, index) => {
          const number = String(index + 1).padStart(2, "0");
          return (
            <li
              key={ceremony.name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-3.5 shadow-sm lg:flex-col lg:items-stretch lg:p-5"
            >
              {/* Phones: one row with the dress code */}
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <span className="text-[12px] font-bold text-gold-deep">{number}</span>
                <div className="min-w-0">
                  <p className="font-serif text-[15px] font-semibold text-burgundy">
                    {ceremony.name}
                  </p>
                  <p className="text-[11px] text-plum">
                    {ceremony.day} · {ceremony.time} · {ceremony.venue}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-burgundy lg:hidden">
                Dress: {ceremony.dressCode}
              </span>

              {/* Desktop: a timeline card */}
              <div className="hidden lg:block">
                <p className="mb-1 text-eyebrow whitespace-nowrap text-gold-deep uppercase">
                  {number} · {ceremony.moment}
                </p>
                <p className="text-title-md text-burgundy">{ceremony.name}</p>
                <p className="mt-1 text-body-sm text-plum">
                  {ceremony.date}
                  <br />
                  {ceremony.time}
                </p>
              </div>
              <p className="mt-4 hidden border-t border-sand pt-3 text-[11px] text-plum lg:block">
                {ceremony.venue}
              </p>
            </li>
          );
        })}
      </ol>

      <InvitationCard />
    </Section>
  );
}

/** One guest's invitation: invited ceremonies plus a single RSVP for the whole party. */
function InvitationCard() {
  const { invitations } = INVITATION_MAPPING;
  return (
    <div
      role="img"
      aria-label={`Example invitation for ${INVITATION_MAPPING.guest}: invited to ${invitations
        .filter((item) => item.invited)
        .map((item) => item.ceremony)
        .join(", ")}; not invited to ${invitations
        .filter((item) => !item.invited)
        .map((item) => item.ceremony)
        .join(", ")}. ${INVITATION_MAPPING.rsvp}.`}
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-sand bg-sand/60 p-4 shadow-sm lg:mt-0 lg:gap-0 lg:rounded-3xl lg:bg-white lg:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 lg:mb-6 lg:border-b lg:border-sand lg:pb-6">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-plum uppercase lg:text-eyebrow lg:text-gold-deep">
            {INVITATION_MAPPING.eyebrow}
          </p>
          <p className="font-serif text-[16px] font-semibold text-burgundy lg:mt-1 lg:font-sans lg:text-title-lg">
            {INVITATION_MAPPING.guest}
          </p>
          <p className="mt-2 hidden w-fit rounded-full border border-sand bg-sand px-2.5 py-0.5 text-label-sm font-semibold text-burgundy lg:block">
            {INVITATION_MAPPING.rsvp}
          </p>
        </div>
        <span className="rounded-full border border-sand bg-sand px-2.5 py-1 text-[11px] font-bold text-burgundy lg:px-3 lg:font-medium">
          {INVITATION_MAPPING.limit}
        </span>
      </div>

      <ul className="flex flex-wrap gap-1.5 pt-1 lg:grid lg:grid-cols-4 lg:gap-3 lg:pt-0">
        {invitations.map(({ ceremony, invited }) => (
          <li
            key={ceremony}
            className={cn(
              "flex items-center gap-1 rounded-full border border-sand bg-white px-2.5 py-1 text-[12px] font-medium",
              "lg:justify-between lg:rounded-xl lg:bg-ivory lg:p-3 lg:text-body-sm lg:font-normal",
              invited ? "text-burgundy" : "text-plum",
            )}
          >
            {invited ? (
              <Check aria-hidden className="size-3.5 lg:hidden" />
            ) : (
              <X aria-hidden className="size-3.5 lg:hidden" />
            )}
            <span className="lg:text-graphite">
              {ceremony}
              <span className="lg:hidden">: {invited ? "Invited" : "Not invited"}</span>
            </span>
            <span className={cn("hidden text-label-sm lg:inline", invited && "font-semibold")}>
              {invited ? "Invited" : "Not invited"}
            </span>
          </li>
        ))}
      </ul>

      <p className="border-t border-sand pt-2 text-[12px] font-semibold text-burgundy lg:hidden">
        {INVITATION_MAPPING.rsvp}
      </p>
    </div>
  );
}
