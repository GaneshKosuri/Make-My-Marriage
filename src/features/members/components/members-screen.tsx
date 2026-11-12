"use client";

import { CheckCircle2, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { SettingsTabs } from "@/components/layout/settings-tabs";
import { UserAvatar } from "@/components/layout/user-avatar";
import { FormAlert } from "@/components/ui/form-controls";
import {
  dangerButton,
  dangerOutlineButton,
  primaryButton,
  secondaryButton,
} from "@/components/ui/button-styles";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ListSkeleton } from "@/components/ui/list-skeleton";
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
import { Dialog } from "@/components/ui/dialog";
import { InviteMemberDialog } from "./invite-member-dialog";

const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

/** One message at a time: each action clears it when it starts and sets its own on success. */
type Notify = (message: string | null) => void;

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
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setInviting(true);
            }}
            className={primaryButton}
          >
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
        onNotice={setNotice}
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
  onNotice,
}: Readonly<{
  isAdmin: boolean;
  currentMembershipId: string;
  timeZone: string;
  onNotice: Notify;
}>) {
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
    onNotice(null);
    remove.reset();
    leave.reset();
    changeRole.mutate(
      { membershipId: member.membershipId, role: nextRole },
      {
        onSuccess: () => {
          onNotice(MEMBERS.roleChanged(member.user.name, MEMBER_ROLE_LABELS[nextRole]));
          // Demoting yourself takes away this page's controls: re-render with the new role.
          if (member.membershipId === currentMembershipId) router.refresh();
        },
      },
    );
  }

  function removeMember(member: MemberDto) {
    onNotice(null);
    changeRole.reset();
    remove.reset();
    leave.reset();
    if (member.membershipId !== currentMembershipId) {
      remove.mutate(member.membershipId, {
        onSuccess: () => onNotice(MEMBERS.removed(member.user.name)),
      });
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
        <button type="button" onClick={() => void members.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", members.isFetching && "animate-spin")} />
          {MEMBERS.loadError.retry}
        </button>
      </div>
    );
  } else if (!members.data) {
    body = <ListSkeleton rows={2} framed={false} />;
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
              {!isAdmin && isSelf && (
                <p className="w-full text-body-sm text-plum sm:w-auto">
                  {MEMBERS.managerLeaveNote}
                </p>
              )}
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
                        className={secondaryButton}
                        aria-label={`${member.role === "ADMIN" ? MEMBERS.makeManager : MEMBERS.makeAdmin}: ${member.user.name}`}
                      >
                        {member.role === "ADMIN" ? MEMBERS.makeManager : MEMBERS.makeAdmin}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirming({ kind: isSelf ? "leave" : "remove", member })}
                        className={dangerOutlineButton}
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
        <button type="button" onClick={onCancel} className={secondaryButton}>
          {copy.cancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={pending?.kind === "demote-self" ? secondaryButton : dangerButton}
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
}: Readonly<{ timeZone: string; onNotice: Notify }>) {
  const invitations = useMemberInvitations(true);
  const revoke = useRevokeInvitation();
  const resend = useResendInvitation();
  const [revoking, setRevoking] = useState<MemberInvitationDto | null>(null);

  function confirmRevoke() {
    if (!revoking) return;
    const { id, email } = revoking;
    setRevoking(null);
    onNotice(null);
    resend.reset();
    revoke.mutate(id, { onSuccess: () => onNotice(MEMBERS.revoked(email)) });
  }
  const busy = revoke.isPending || resend.isPending;
  const error = revoke.error ?? resend.error;

  let body: ReactNode;
  if (invitations.isError) {
    body = (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-destructive">{MEMBERS.loadError.title}</p>
        <button
          type="button"
          onClick={() => void invitations.refetch()}
          className={secondaryButton}
        >
          <RefreshCw aria-hidden className="size-4" />
          {MEMBERS.loadError.retry}
        </button>
      </div>
    );
  } else if (!invitations.data) {
    body = <ListSkeleton rows={1} framed={false} />;
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
            // Phones: email (full width, wrapping), then role · expiry, then the actions,
            // so invitations stay tell-apart-able (QA M6).
            <li
              key={invitation.id}
              className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-label-md wrap-anywhere text-graphite">{invitation.email}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-body-sm text-plum">
                  <RolePill role={invitation.role} />
                  <span>
                    {MEMBERS.expires(formatInstant(invitation.expiresAt, timeZone, SHORT_DATE))}
                  </span>
                </p>
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onNotice(null);
                    revoke.reset();
                    resend.mutate(invitation, {
                      onSuccess: () => onNotice(MEMBERS.resent(invitation.email)),
                    });
                  }}
                  className={secondaryButton}
                  aria-label={`${MEMBERS.resend}: ${invitation.email}`}
                >
                  {resending ? MEMBERS.resending : MEMBERS.resend}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRevoking(invitation)}
                  className={dangerOutlineButton}
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
      <Dialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title={MEMBERS.confirm.revokeTitle}
        description={
          revoking && (
            <>
              {MEMBERS.confirm.revokeDescription[0]}
              <strong className="text-graphite">{revoking.email}</strong>
              {MEMBERS.confirm.revokeDescription[1]}
            </>
          )
        }
      >
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setRevoking(null)} className={secondaryButton}>
            {MEMBERS.confirm.cancel}
          </button>
          <button type="button" onClick={confirmRevoke} className={dangerButton}>
            {MEMBERS.revoke}
          </button>
        </div>
      </Dialog>
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
