import { Flower2, UserPlus } from "lucide-react";

import { cn } from "@/lib/cn";
import { MEMBER_ROLE_LABELS } from "@/modules/members/member.constants";

import { FAMILY, SECTION_IDS } from "../home-content";
import { Section, SectionIntro } from "./section";

const AVATAR_CLASSES = [
  "bg-burgundy text-white",
  "bg-burgundy-deep text-white",
  "bg-burgundy text-white",
  "bg-sand text-graphite",
];

export function FamilyTeam() {
  return (
    <Section id={SECTION_IDS.families} tone="sand" labelledBy="family-title">
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-0">
          <SectionIntro
            headingId="family-title"
            tone="sand"
            eyebrow={FAMILY.eyebrow}
            icon={FAMILY.icon}
            title={
              <>
                <span className="lg:block">{FAMILY.titleLines[0]}</span>{" "}
                <span className="lg:block">{FAMILY.titleLines[1]}</span>
              </>
            }
            intro={FAMILY.intro}
            className="mb-0 lg:mb-8"
          />
          <div className="flex items-start gap-3 rounded-2xl border border-sand bg-white p-4 shadow-sm lg:p-6">
            <Flower2 aria-hidden className="mt-0.5 size-6 shrink-0 text-burgundy" />
            <div>
              <h3 className="font-serif text-title-md text-burgundy lg:font-sans">
                {FAMILY.callout.title}
              </h3>
              <p className="mt-1 text-body-sm text-plum lg:mt-2 lg:text-body-md">
                {FAMILY.callout.text}
              </p>
            </div>
          </div>
        </div>

        <TeamCard className="lg:col-span-7" />
      </div>
    </Section>
  );
}

function TeamCard({ className }: Readonly<{ className?: string }>) {
  const { team } = FAMILY;
  const invite = (
    <>
      <UserPlus aria-hidden className="size-[18px]" />
      {team.invite}
    </>
  );
  return (
    <div
      role="img"
      aria-label={`Example family team: ${team.members.map((member) => `${member.name}, ${MEMBER_ROLE_LABELS[member.role]}`).join("; ")}.`}
      className={cn(
        "rounded-2xl border border-sand bg-white p-4 shadow-md sm:p-8 lg:rounded-3xl",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-sand pb-3 sm:mb-6 sm:pb-6">
        <div>
          <p className="text-title-md text-burgundy sm:text-title-lg">{team.title}</p>
          <p className="mt-0.5 text-body-sm text-plum">{team.subtitle}</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-sand bg-sand px-4 py-2 text-label-md text-burgundy sm:flex">
          {invite}
        </span>
      </div>
      <ul className="space-y-2.5 sm:space-y-4">
        {team.members.map((member, index) => (
          <li
            key={member.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-sand bg-ivory p-2 sm:rounded-2xl sm:p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold sm:size-10 sm:text-sm",
                  AVATAR_CLASSES[index % AVATAR_CLASSES.length],
                )}
              >
                {member.initials}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-graphite sm:text-title-md">
                  {member.name}
                </p>
                <p className="text-[11px] text-plum sm:text-body-sm">{member.relation}</p>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border border-sand bg-sand px-2.5 py-0.5 text-[11px] font-semibold sm:px-3 sm:py-1",
                member.role === "ADMIN" ? "text-burgundy" : "text-plum",
              )}
            >
              {MEMBER_ROLE_LABELS[member.role]}
            </span>
          </li>
        ))}
      </ul>
      <span className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sand bg-sand/70 py-2.5 text-[14px] font-semibold text-burgundy sm:hidden">
        {invite}
      </span>
    </div>
  );
}
