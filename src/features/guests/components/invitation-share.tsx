"use client";

import { Check, Copy, ExternalLink, MessageCircle, RefreshCw } from "lucide-react";
import { useId, useRef, useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { cn } from "@/lib/cn";
import { buildInvitationShareMessage, buildWhatsAppShareUrl } from "@/lib/whatsapp";

import { useInvitationLink } from "../api";
import { GUESTS } from "../guests-content";

const COPY = GUESTS.share;

/**
 * The guest's own invitation link (PRD §9.9, §9.14; API_DESIGN §45): copy it,
 * open it as the guest sees it, or share it on WhatsApp with a ready message.
 * Sharing never counts as sending the invitation by email.
 */
export function InvitationShare({
  guestId,
  guestName,
  coupleName,
}: Readonly<{ guestId: string; guestName: string; coupleName: string }>) {
  const link = useInvitationLink(guestId);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const fieldId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);

  let body;
  if (link.data) {
    const { url } = link.data;
    const whatsApp = buildWhatsAppShareUrl(
      buildInvitationShareMessage({ coupleNames: coupleName, guestName, invitationUrl: url }),
    );
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied("yes");
      } catch {
        // No clipboard (an old browser, or permission refused): show the link to copy by hand.
        setCopied("failed");
        requestAnimationFrame(() => fieldRef.current?.select());
      }
    };
    body = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:flex md:flex-wrap">
          <a
            href={whatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(primaryButton, "min-[400px]:col-span-2")}
          >
            <MessageCircle aria-hidden className="size-4" />
            {COPY.whatsApp}
          </a>
          <button type="button" onClick={() => void copy()} className={secondaryButton}>
            {copied === "yes" ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Copy aria-hidden className="size-4" />
            )}
            {copied === "yes" ? COPY.copied : COPY.copy}
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
            <ExternalLink aria-hidden className="size-4" />
            {COPY.open}
          </a>
        </div>
        <p role="status" className="sr-only">
          {copied === "yes" ? COPY.copiedStatus : ""}
        </p>
        {copied === "failed" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fieldId} className="text-body-sm text-plum">
              {COPY.copyByHand}
            </label>
            <input
              ref={fieldRef}
              id={fieldId}
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className={cn(
                "h-11 w-full rounded-xl border border-sand bg-ivory px-3 text-body-sm text-graphite",
                focusRing,
              )}
            />
          </div>
        )}
        <p className="text-body-sm text-plum">{COPY.hint}</p>
      </div>
    );
  } else if (link.isError) {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-destructive">{COPY.error}</p>
        <button type="button" onClick={() => void link.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", link.isFetching && "animate-spin")} />
          {GUESTS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = (
      <div aria-busy="true" aria-label="Loading" className="flex animate-pulse gap-2">
        <div className="h-11 w-48 rounded-full bg-sand" />
        <div className="h-11 w-28 rounded-full bg-sand" />
      </div>
    );
  }

  return (
    <DashboardCard title={COPY.title} description={COPY.description}>
      {body}
    </DashboardCard>
  );
}
