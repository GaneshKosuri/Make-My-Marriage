import { Minus, Plus, Share2 } from "lucide-react";
import type { ReactNode } from "react";

import { GUEST_EXPERIENCE, SAMPLE_WEDDING, SECTION_IDS } from "../home-content";
import { Section, SectionIntro } from "./section";

const { invitation, rsvpForm } = GUEST_EXPERIENCE;
const MOCKUP_LABEL = `Example guest invitation for ${SAMPLE_WEDDING.couple}: ${invitation.invitedTo}, with an RSVP form for up to 4 guests. ${rsvpForm.footnote}.`;

export function GuestExperience() {
  return (
    <Section id={SECTION_IDS.guests} tone="dark" labelledBy="guests-title">
      <SectionIntro
        headingId="guests-title"
        tone="dark"
        eyebrow={GUEST_EXPERIENCE.eyebrow}
        icon={GUEST_EXPERIENCE.icon}
        title={GUEST_EXPERIENCE.title}
        intro={GUEST_EXPERIENCE.intro}
      />

      <div className="grid items-center gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-8">
          <ol className="flex flex-col gap-3 lg:gap-8">
            {GUEST_EXPERIENCE.steps.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-burgundy/80 p-3.5 lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-gold-light/40 bg-ivory/10 text-[12px] font-bold text-gold-light lg:size-10 lg:text-base">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-serif text-[15px] font-semibold lg:mb-1 lg:font-sans lg:text-title-lg">
                    {step.title}
                  </h3>
                  <p className="mt-0.5 text-body-sm text-ivory/75 lg:text-body-md lg:text-sand">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {/* Highlights the WhatsApp share flow; sharing itself happens inside the workspace. */}
          <p className="flex w-full items-center justify-center gap-2.5 rounded-full bg-ivory px-6 py-3.5 text-title-md text-burgundy shadow-md lg:mt-4 lg:w-fit lg:bg-white lg:py-3">
            <Share2 aria-hidden className="size-5" />
            {GUEST_EXPERIENCE.share}
          </p>
        </div>

        <div role="img" aria-label={MOCKUP_LABEL} className="lg:col-span-7">
          <CompactRsvpCard />
          <div className="hidden flex-wrap justify-center gap-6 sm:flex lg:justify-end">
            <InvitationPhone />
            <RsvpPhone />
          </div>
        </div>
      </div>
    </Section>
  );
}

function PhoneFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="w-64 rounded-[32px] border border-sand bg-white p-4 text-graphite shadow-2xl">
      <div className="mx-auto mb-4 h-1 w-16 rounded-full bg-sand" />
      {children}
    </div>
  );
}

function InvitationPhone() {
  return (
    <PhoneFrame>
      <div className="mb-4 border-b border-sand pb-4 text-center">
        <p className="text-[10px] tracking-widest text-plum uppercase">{invitation.label}</p>
        <p className="mt-1 font-serif text-[20px] font-semibold text-burgundy">
          {SAMPLE_WEDDING.couple}
        </p>
        <p className="mt-0.5 text-[11px] text-plum">{invitation.place}</p>
      </div>
      <div className="mb-3 rounded-xl border border-sand bg-ivory p-3 text-center">
        <p className="text-body-sm font-semibold text-burgundy">{invitation.welcome}</p>
        <p className="text-[11px] text-plum">{invitation.invitedTo}</p>
      </div>
      <ul className="space-y-1.5 text-[11px] text-plum">
        {invitation.ceremonies.map((ceremony) => (
          <li
            key={ceremony}
            className="flex items-center justify-between rounded-lg border border-sand bg-sand p-2"
          >
            {ceremony}
            <span className="font-semibold text-burgundy">✓</span>
          </li>
        ))}
      </ul>
    </PhoneFrame>
  );
}

function YesNo() {
  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <span className="rounded-full bg-burgundy px-2.5 py-0.5 font-semibold text-white">
        {rsvpForm.yes}
      </span>
      <span className="rounded-full border border-sand bg-white px-2.5 py-0.5 text-plum">
        {rsvpForm.no}
      </span>
    </span>
  );
}

function RsvpPhone() {
  return (
    <PhoneFrame>
      <div className="mb-3 border-b border-sand pb-3">
        <p className="text-title-md text-burgundy">{rsvpForm.title}</p>
        <p className="mt-0.5 text-[11px] text-plum">{rsvpForm.cap}</p>
      </div>
      <div className="mb-4 space-y-2.5">
        <p className="flex items-center justify-between rounded-xl border border-sand bg-ivory p-2.5 text-body-sm font-medium">
          {rsvpForm.question}
          <YesNo />
        </p>
        <p className="flex items-center justify-between rounded-xl border border-sand bg-ivory p-2.5 text-body-sm font-medium">
          {rsvpForm.headcountLabel}
          <span className="text-title-md text-burgundy">{rsvpForm.headcount}</span>
        </p>
      </div>
      <p className="w-full rounded-xl bg-burgundy py-2.5 text-center text-[13px] font-semibold text-white shadow-sm">
        {rsvpForm.submit}
      </p>
      <p className="mt-2 text-center text-[10px] text-plum">{rsvpForm.footnote}</p>
    </PhoneFrame>
  );
}

/** Small phones: invitation and RSVP form in one card (mobile design). */
function CompactRsvpCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sand bg-white p-4 text-graphite shadow-lg sm:hidden">
      <div className="flex items-center justify-between rounded-xl border border-sand bg-ivory p-2.5">
        <div>
          <p className="text-[10px] font-bold tracking-wider text-gold-deep uppercase">
            {invitation.compactLabel}
          </p>
          <p className="font-serif text-[16px] font-bold text-burgundy">{SAMPLE_WEDDING.couple}</p>
        </div>
        <span className="text-[11px] text-plum">{invitation.date}</span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl border border-sand bg-sand/40 p-3">
        <p className="flex items-center justify-between text-[13px] font-semibold text-burgundy">
          {rsvpForm.question}
          <YesNo />
        </p>
        <p className="flex items-center justify-between border-t border-sand/60 pt-1 text-[12px] font-medium">
          {rsvpForm.headcountLabel}
          <span className="flex items-center gap-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-sand">
              <Minus aria-hidden className="size-3" />
            </span>
            <span className="text-[15px] font-bold text-burgundy">{rsvpForm.headcount}</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-sand">
              <Plus aria-hidden className="size-3" />
            </span>
          </span>
        </p>
      </div>
      <p className="w-full rounded-xl bg-burgundy py-2.5 text-center text-[13px] font-semibold text-ivory shadow-sm">
        {rsvpForm.submit}
      </p>
      <p className="text-center text-[11px] text-plum">{rsvpForm.footnote}</p>
    </div>
  );
}
