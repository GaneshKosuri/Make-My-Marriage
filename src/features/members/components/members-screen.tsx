"use client";

import { CheckCircle2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { UserAvatar } from "@/components/layout/user-avatar";
import { SettingsTabs } from "@/components/layout/settings-tabs";
import { FormAlert } from "@/features/auth/components/form-controls";
import {
  DashboardCard,
  focusRing,
  primaryButton,
} from "@/features/dashboard/components/dashboard-card";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatInstant } from "@/lib/dates";
import { MEMBER_ROLE_LABELS, type MemberRole } from "@/modules/members/member.constants";
import type { MemberDto, MemberInvitationDto } from "@/modules/members/member.types";

import {
  useChangeMemberRole,
  useLeaveWedding,
  useMemberInvitations,
  useMembers,
  useRemoveMember,
  useResendInvitation,
  useRevokeInvitation,
} from "../api";
import { MEMBERS } from "../members-content";
import { Dialog } from "./dialog";
import { InviteMemberDialog } from "./invite-member-dialog";

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

const smallButton = cn(
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-sand bg-white px-3.5 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
  focusRing,
);
const dangerButton = cn(
  smallButton,
  "border-destructive/30 text-destructive hover:bg-destructive/5",
);

export interface MembersScreenProps {
  role: MemberRole;
  /** The viewer's own membership, to mark "You" and offer Leave instead of Remove. */
  currentMembershipId: string;
  /** Dates show in the wedding's time zone. */
  timeZone: string;
}

/** What the confirmation dialog is asking about. */
type Pending =
  | { kind: "remove"; member: MemberDto }
  | { kind: "leave"; member: MemberDto }
  | { kind: "demote-self"; member: MemberDto };

/**
 * Settings → Wedding Members (PRD §9.4, API_DESIGN §21–28). Admins invite,
 * change roles, remove and manage pending invitations; Managers see the
 * list read-only. The wedding always keeps at least one Admin.
 */
export function MembersScreen({
  role,
  currentMembershipId,
  timeZone,
}: Readonly<MembersScreenProps>) {
  const isAdmin = role === "ADMIN";
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{MEMBERS.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {MEMBERS.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{MEMBERS.description}</p>
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setInviting(true)} className={primaryButton}>
            <UserPlus aria-hidden className="size-4" />
            {MEMBERS.invite}
          </button>
        )}
      </header>

      <SettingsTabs />

      <p className="flex gap-3 rounded-2xl bg-sand p-4 text-body-sm text-plum">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
        <span>
          {MEMBERS.roles}
          {!isAdmin && <span className="mt-1 block">{MEMBERS.managerNote}</span>}
        </span>
      </p>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      <MembersList
        isAdmin={isAdmin}
        currentMembershipId={currentMembershipId}
        timeZone={timeZone}
      />

      {isAdmin && <PendingInvitations timeZone={timeZone} onNotice={setNotice} />}

      {isAdmin && (
        <InviteMemberDialog
          open={inviting}
          onClose={() => setInviting(false)}
          onInvited={(email) => setNotice(MEMBERS.inviteDialog.sent(email))}
        />
      )}
    </div>
  );
}

function MembersList({
  isAdmin,
  currentMembershipId,
  timeZone,
}: Readonly<{ isAdmin: boolean; currentMembershipId: string; timeZone: string }>) {
  const router = useRouter();
  const members = useMembers();
  const changeRole = useChangeMemberRole();
  const remove = useRemoveMember();
  const leave = useLeaveWedding();
  const [confirming, setConfirming] = useState<Pending | null>(null);

  const list = members.data ?? [];
  const adminCount = list.filter((member) => member.role === "ADMIN").length;
  const busy = changeRole.isPending || remove.isPending || leave.isPending || leave.isSuccess;
  const error = changeRole.error ?? remove.error ?? leave.error;

  function setRole(member: MemberDto, nextRole: MemberRole) {
    remove.reset();
    leave.reset();
    changeRole.mutate(
      { membershipId: member.membershipId, role: nextRole },
      {
        // Demoting yourself takes away this page's controls: re-render with the new role.
        onSuccess: () => {
          if (member.membershipId === currentMembershipId) router.refresh();
        },
      },
    );
  }

  function removeMember(member: MemberDto) {
    changeRole.reset();
    remove.reset();
    leave.reset();
    if (member.membershipId !== currentMembershipId) {
      remove.mutate(member.membershipId);
      return;
    }
    // Leaving the wedding: the dashboard is no longer yours.
    leave.mutate(member.membershipId, { onSuccess: () => router.replace("/create-wedding") });
  }

  function confirm() {
    if (!confirming) return;
    const { kind, member } = confirming;
    setConfirming(null);
    if (kind === "demote-self") setRole(member, "MANAGER");
    else removeMember(member);
  }

  let body: ReactNode;
  if (members.isError) {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-destructive">{MEMBERS.loadError.title}</p>
        <button type="button" onClick={() => void members.refetch()} className={smallButton}>
          <RefreshCw aria-hidden className={cn("size-4", members.isFetching && "animate-spin")} />
          {MEMBERS.loadError.retry}
        </button>
      </div>
    );
  } else if (!members.data) {
    body = <ListSkeleton />;
  } else {
    body = (
      <ul className="divide-y divide-sand">
        {list.map((member) => {
          const isSelf = member.membershipId === currentMembershipId;
          const soleAdmin = member.role === "ADMIN" && adminCount <= 1;
          return (
            <li
              key={member.membershipId}
              className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <UserAvatar name={member.user.name} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-label-md text-graphite">
                  <span className="truncate">{member.user.name}</span>
                  {isSelf && <span className="text-body-sm text-plum">({MEMBERS.you})</span>}
                  <RolePill role={member.role} />
                </p>
                <p className="truncate text-body-sm text-plum">{member.user.email}</p>
                <p className="text-body-sm text-plum">
                  {MEMBERS.joined(formatInstant(member.joinedAt, timeZone, SHORT_DATE))}
                </p>
              </div>
              {isAdmin && (
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {soleAdmin ? (
                    <p className="text-body-sm text-plum">{MEMBERS.lastAdmin}</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          member.role === "ADMIN"
                            ? isSelf
                              ? setConfirming({ kind: "demote-self", member })
                              : setRole(member, "MANAGER")
                            : setRole(member, "ADMIN")
                        }
                        className={smallButton}
                        aria-label={`${member.role === "ADMIN" ? MEMBERS.makeManager : MEMBERS.makeAdmin}: ${member.user.name}`}
                      >
                        {member.role === "ADMIN" ? MEMBERS.makeManager : MEMBERS.makeAdmin}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming({ kind: isSelf ? "leave" : "remove", member })}
                        className={dangerButton}
                        aria-label={
                          isSelf ? MEMBERS.leave : `${MEMBERS.remove}: ${member.user.name}`
                        }
                      >
                        {isSelf ? MEMBERS.leave : MEMBERS.remove}
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <DashboardCard
      title={MEMBERS.listTitle}
      description={members.data ? MEMBERS.listDescription(list.length) : undefined}
    >
      {error && <MutationAlert error={error} />}
      {body}
      <ConfirmDialog
        pending={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={confirm}
      />
    </DashboardCard>
  );
}

function MutationAlert({ error }: Readonly<{ error: unknown }>) {
  if (error instanceof ApiError && error.code === "LAST_ADMIN") {
    return <FormAlert title={MEMBERS.lastAdmin} />;
  }
  return (
    <FormAlert title={MEMBERS.genericError.title}>{MEMBERS.genericError.description}</FormAlert>
  );
}

function ConfirmDialog({
  pending,
  onCancel,
  onConfirm,
}: Readonly<{ pending: Pending | null; onCancel: () => void; onConfirm: () => void }>) {
  const copy = MEMBERS.confirm;
  const content = !pending
    ? null
    : pending.kind === "remove"
      ? {
          title: copy.removeTitle(pending.member.user.name),
          description: copy.removeDescription,
          action: MEMBERS.remove,
        }
      : pending.kind === "leave"
        ? { title: copy.leaveTitle, description: copy.leaveDescription, action: MEMBERS.leave }
        : {
            title: copy.demoteSelfTitle,
            description: copy.demoteSelfDescription,
            action: MEMBERS.makeManager,
          };

  return (
    <Dialog
      open={content !== null}
      onClose={onCancel}
      title={content?.title ?? ""}
      description={content?.description}
    >
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <button type="button" onClick={onCancel} className={smallButton}>
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            pending?.kind === "demote-self" ? smallButton : dangerButton,
            "border-transparent",
            pending?.kind !== "demote-self" && "bg-destructive text-white hover:bg-destructive/90",
          )}
        >
          {content?.action}
        </button>
      </div>
    </Dialog>
  );
}

function PendingInvitations({
  timeZone,
  onNotice,
}: Readonly<{ timeZone: string; onNotice: (message: string) => void }>) {
  const invitations = useMemberInvitations(true);
  const revoke = useRevokeInvitation();
  const resend = useResendInvitation();
  const busy = revoke.isPending || resend.isPending;
  const error = revoke.error ?? resend.error;

  let body: ReactNode;
  if (invitations.isError) {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-destructive">{MEMBERS.loadError.title}</p>
        <button type="button" onClick={() => void invitations.refetch()} className={smallButton}>
          <RefreshCw aria-hidden className="size-4" />
          {MEMBERS.loadError.retry}
        </button>
      </div>
    );
  } else if (!invitations.data) {
    body = <ListSkeleton rows={1} />;
  } else if (invitations.data.length === 0) {
    body = (
      <p className="rounded-2xl border border-dashed border-sand bg-ivory px-5 py-6 text-center text-body-md text-plum">
        {MEMBERS.noInvitations}
      </p>
    );
  } else {
    body = (
      <ul className="divide-y divide-sand">
        {invitations.data.map((invitation: MemberInvitationDto) => {
          const resending = resend.isPending && resend.variables?.id === invitation.id;
          return (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-label-md text-graphite">
                  <span className="truncate">{invitation.email}</span>
                  <RolePill role={invitation.role} />
                </p>
                <p className="text-body-sm text-plum">
                  {MEMBERS.expires(formatInstant(invitation.expiresAt, timeZone, SHORT_DATE))}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    revoke.reset();
                    resend.mutate(invitation, {
                      onSuccess: () => onNotice(MEMBERS.resent(invitation.email)),
                    });
                  }}
                  className={smallButton}
                  aria-label={`${MEMBERS.resend}: ${invitation.email}`}
                >
                  {resending ? MEMBERS.resending : MEMBERS.resend}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    resend.reset();
                    revoke.mutate(invitation.id);
                  }}
                  className={dangerButton}
                  aria-label={`${MEMBERS.revoke}: ${invitation.email}`}
                >
                  {MEMBERS.revoke}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <DashboardCard title={MEMBERS.invitationsTitle} description={MEMBERS.invitationsDescription}>
      {error && <InvitationAlert error={error} />}
      {body}
    </DashboardCard>
  );
}

function InvitationAlert({ error }: Readonly<{ error: unknown }>) {
  if (error instanceof ApiError && error.code === "EXTERNAL_SERVICE_ERROR") {
    const copy = MEMBERS.inviteDialog.emailFailed;
    return <FormAlert title={copy.title}>{copy.description}</FormAlert>;
  }
  return (
    <FormAlert title={MEMBERS.genericError.title}>{MEMBERS.genericError.description}</FormAlert>
  );
}

function RolePill({ role }: Readonly<{ role: MemberRole }>) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-label-sm",
        role === "ADMIN"
          ? "border-burgundy/20 bg-burgundy/5 text-burgundy"
          : "border-sand bg-ivory text-plum",
      )}
    >
      {MEMBER_ROLE_LABELS[role]}
    </span>
  );
}

function ListSkeleton({ rows = 2 }: Readonly<{ rows?: number }>) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-3">
          <div className="size-10 rounded-full bg-sand" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-sand" />
            <div className="h-3 w-56 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}
