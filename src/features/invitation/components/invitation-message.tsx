import { MailQuestion } from "lucide-react";

import { secondaryButton } from "@/components/ui/button-styles";

import { INVITATION } from "../invitation-content";

/** A link that can't be shown: unknown or withdrawn, or briefly unavailable. */
export function InvitationMessage({ kind }: Readonly<{ kind: "not-found" | "unavailable" }>) {
  const copy = kind === "not-found" ? INVITATION.notFound : INVITATION.unavailable;
  return (
    <section className="mt-10 rounded-3xl border border-sand bg-white px-6 py-10 text-center shadow-sm">
      <MailQuestion aria-hidden className="mx-auto size-9 text-gold-deep" />
      <h1 className="mt-4 font-serif text-headline-sm text-graphite">{copy.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-body-md text-plum">{copy.description}</p>
      {kind === "unavailable" && (
        // A plain reload of the same address.
        <a href="" className={`${secondaryButton} mt-6`}>
          {INVITATION.unavailable.retry}
        </a>
      )}
    </section>
  );
}
