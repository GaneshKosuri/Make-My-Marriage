"use client";

import { ArrowRight, CalendarHeart, LinkIcon, Loader2, RefreshCw, UserRoundX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { errorCode, useLogout } from "@/features/auth/api";
import { AUTH_ROUTES, GENERIC_ERROR } from "@/features/auth/auth-content";
import { AuthCard, AuthShell } from "@/features/auth/components/auth-shell";
import {
  FormAlert,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/features/auth/components/form-controls";
import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";
import { normalizeEmail } from "@/lib/email";
import type { AuthResultDto } from "@/modules/auth/auth.types";
import { MEMBER_ROLE_LABELS } from "@/modules/members/member.constants";
import type { PublicMemberInvitationDto } from "@/modules/members/member.types";

import { useAcceptMemberInvitation } from "../api";
import { JOIN } from "../join-content";
import { JoinAuthForms } from "./join-auth-forms";

/** Who is looking at the page, from the server-side session (null when signed out). */
export interface JoinViewer {
  name: string;
  email: string;
  hasWedding: boolean;
}

/** What the server found for the token: the invitation, nothing usable, or an outage. */
export type JoinInvitationState =
  | { status: "ok"; invitation: PublicMemberInvitationDto }
  | { status: "not-found" }
  | { status: "unavailable" };

type EndedReason = "invalid" | "expired" | "accepted";

/**
 * /join/[token] — accept a Wedding Member invitation (PRD §9.4, SYSTEM_DESIGN §19,
 * API_DESIGN §25–26). Signed-out visitors create an account or sign in here,
 * with the invited email; then the invitation is accepted and they land on the
 * dashboard.
 */
export function JoinScreen({
  token,
  state,
  viewer: initialViewer,
}: Readonly<{ token: string; state: JoinInvitationState; viewer: JoinViewer | null }>) {
  const [viewer, setViewer] = useState(initialViewer);
  const [ended, setEnded] = useState<EndedReason | null>(null);

  if (state.status === "unavailable") return <Unavailable />;
  if (state.status === "not-found" || ended) {
    return <InvitationEnded reason={ended ?? "invalid"} signedIn={viewer !== null} />;
  }
  return (
    <InvitationFlow
      token={token}
      invitation={state.invitation}
      viewer={viewer}
      onViewerChange={setViewer}
      onEnded={setEnded}
    />
  );
}

function InvitationFlow({
  token,
  invitation,
  viewer,
  onViewerChange,
  onEnded,
}: Readonly<{
  token: string;
  invitation: PublicMemberInvitationDto;
  viewer: JoinViewer | null;
  onViewerChange: (viewer: JoinViewer | null) => void;
  onEnded: (reason: EndedReason) => void;
}>) {
  const router = useRouter();
  const accept = useAcceptMemberInvitation(token);
  const logout = useLogout();
  const couple = coupleDisplayName(invitation.wedding);
  const roleLabel = MEMBER_ROLE_LABELS[invitation.role];

  function acceptNow() {
    accept.mutate(undefined, {
      onSuccess: () => router.replace(AUTH_ROUTES.app),
      onError: (error) => {
        switch (errorCode(error)) {
          case "INVALID_TOKEN":
          case "NOT_FOUND":
            return onEnded("invalid");
          case "TOKEN_EXPIRED":
            return onEnded("expired");
          case "INVITATION_ALREADY_ACCEPTED":
            return onEnded("accepted");
          case "ALREADY_HAS_WEDDING":
            if (viewer) onViewerChange({ ...viewer, hasWedding: true });
            return;
        }
      },
    });
  }

  function onSignedIn({ user, hasWedding }: AuthResultDto) {
    onViewerChange({ name: user.name, email: user.email, hasWedding });
    if (!hasWedding && normalizeEmail(user.email) === normalizeEmail(invitation.email)) {
      acceptNow();
    }
  }

  const emailMatches =
    viewer !== null && normalizeEmail(viewer.email) === normalizeEmail(invitation.email);
  const joining = accept.isPending || accept.isSuccess;

  let body: ReactNode;
  if (!viewer) {
    body = <JoinAuthForms email={invitation.email} onSignedIn={onSignedIn} />;
  } else if (viewer.hasWedding) {
    body = (
      <FormAlert title={JOIN.alreadyHasWedding.title}>
        <p>{JOIN.alreadyHasWedding.description}</p>
        <Link href={AUTH_ROUTES.app} className="mt-2 inline-block font-semibold text-burgundy">
          {JOIN.alreadyHasWedding.action}
        </Link>
      </FormAlert>
    );
  } else if (!emailMatches) {
    const [before, invited, middle, current, after] = JOIN.mismatch.description(
      invitation.email,
      viewer.email,
    );
    body = (
      <div className="flex flex-col gap-5">
        <FormAlert title={JOIN.mismatch.title}>
          {before}
          <strong className="text-graphite">{invited}</strong>
          {middle}
          <strong className="text-graphite">{current}</strong>
          {after}
        </FormAlert>
        <button
          type="button"
          disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSettled: () => onViewerChange(null) })}
          className={secondaryButtonClass}
        >
          <UserRoundX aria-hidden />
          {JOIN.mismatch.action}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {accept.isError && <AcceptAlert error={accept.error} />}
        <p className="text-body-md text-plum">{JOIN.signedInAs(viewer.name)}</p>
        <button
          type="button"
          disabled={joining}
          aria-busy={joining || undefined}
          onClick={acceptNow}
          className={primaryButtonClass}
        >
          {joining ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              {JOIN.accepting}
            </>
          ) : (
            <>
              {JOIN.accept}
              <ArrowRight aria-hidden />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <AuthShell panel={<InvitationPanel invitation={invitation} />}>
      <AuthCard
        eyebrow={JOIN.eyebrow}
        title={JOIN.title(couple)}
        description={
          <>
            {formatDateOnly(invitation.wedding.weddingDate)} · {JOIN.role(roleLabel)}
            <span className="mt-1 block text-body-sm">
              {JOIN.roleDescriptions[invitation.role]}
            </span>
          </>
        }
      >
        {body}
      </AuthCard>
    </AuthShell>
  );
}

function AcceptAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    // These change the screen instead (see acceptNow).
    case "INVALID_TOKEN":
    case "NOT_FOUND":
    case "TOKEN_EXPIRED":
    case "INVITATION_ALREADY_ACCEPTED":
    case "ALREADY_HAS_WEDDING":
      return null;
    case "INVITATION_EMAIL_MISMATCH":
      return <FormAlert title={JOIN.mismatch.title} />;
    case "RATE_LIMITED":
      return (
        <FormAlert title={JOIN.tooManyAttempts.title}>{JOIN.tooManyAttempts.description}</FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}

/** Desktop brand panel: the couple the visitor is invited to plan for. */
function InvitationPanel({ invitation }: Readonly<{ invitation: PublicMemberInvitationDto }>) {
  return (
    <>
      <p className="text-eyebrow text-gold-deep uppercase">{JOIN.panelEyebrow}</p>
      <p className="mt-3 font-serif text-headline-lg">{coupleDisplayName(invitation.wedding)}</p>
      <p className="mt-2 flex items-center gap-2 text-body-md text-plum">
        <CalendarHeart aria-hidden className="size-4 text-gold-deep" />
        {formatDateOnly(invitation.wedding.weddingDate)}
      </p>
      <hr className="my-6 border-graphite/10" />
      <p className="text-body-sm text-plum">
        {JOIN.invitedEmail} <span className="font-semibold text-graphite">{invitation.email}</span>
      </p>
    </>
  );
}

function InvitationEnded({
  reason,
  signedIn,
}: Readonly<{ reason: EndedReason; signedIn: boolean }>) {
  const copy = JOIN.ended[reason];
  const next = signedIn
    ? { href: AUTH_ROUTES.app, label: JOIN.ended.dashboard }
    : { href: AUTH_ROUTES.signIn, label: JOIN.ended.signIn };
  return (
    <AuthShell>
      <AuthCard
        centered
        icon={<LinkIcon aria-hidden />}
        title={copy.title}
        description={copy.description}
      >
        <div className="flex flex-col gap-3">
          <Link href={next.href} className={primaryButtonClass}>
            {next.label}
          </Link>
          <Link href="/" className={secondaryButtonClass}>
            {JOIN.ended.home}
          </Link>
        </div>
      </AuthCard>
    </AuthShell>
  );
}

function Unavailable() {
  const router = useRouter();
  return (
    <AuthShell>
      <AuthCard
        centered
        icon={<RefreshCw aria-hidden />}
        title={JOIN.unavailable.title}
        description={JOIN.unavailable.description}
      >
        <button type="button" onClick={() => router.refresh()} className={primaryButtonClass}>
          {JOIN.unavailable.action}
        </button>
      </AuthCard>
    </AuthShell>
  );
}
