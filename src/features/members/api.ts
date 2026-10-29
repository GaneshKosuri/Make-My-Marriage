"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiAction, apiFetch } from "@/lib/api-client";
import type { MemberRole } from "@/modules/members/member.constants";
import type {
  AcceptMemberInvitationResultDto,
  InviteMemberInput,
  MemberDto,
  MemberInvitationDto,
} from "@/modules/members/member.types";

import { authKeys } from "@/features/auth/query-keys";
import { dashboardKeys } from "@/features/dashboard/query-keys";

import { membersKeys } from "./query-keys";

/** TanStack Query hooks over the Wedding Members REST API (API_DESIGN §21–28). */

/** GET /api/members (API §21): Admins and Managers. */
export function useMembers() {
  return useQuery({
    queryKey: membersKeys.list(),
    queryFn: ({ signal }) => apiFetch<MemberDto[]>("/api/members", { signal }),
  });
}

/** GET /api/members/invitations (API §23): Admins only, so callers pass `enabled`. */
export function useMemberInvitations(enabled: boolean) {
  return useQuery({
    queryKey: membersKeys.invitations(),
    queryFn: ({ signal }) =>
      apiFetch<MemberInvitationDto[]>("/api/members/invitations", { signal }),
    enabled,
  });
}

/** Members and invitations change together, and the dashboard counts members. */
function useInvalidateMembers() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: membersKeys.all }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
}

/** POST /api/members/invitations (API §22): emails the join link. */
export function useInviteMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      apiFetch<MemberInvitationDto>("/api/members/invitations", { method: "POST", body: input }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/members/invitations/:id (API §24). */
export function useRevokeInvitation() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiAction(`/api/members/invitations/${encodeURIComponent(invitationId)}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });
}

/**
 * POST /api/members/invitations/:id/resend (decided 2026-10-29): a fresh link on
 * the same invitation. If the email fails, the old link keeps working.
 */
export function useResendInvitation() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (invitation: MemberInvitationDto) =>
      apiFetch<MemberInvitationDto>(
        `/api/members/invitations/${encodeURIComponent(invitation.id)}/resend`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  });
}

/** PATCH /api/members/:id (API §27). */
export function useChangeMemberRole() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: MemberRole }) =>
      apiFetch<MemberDto>(`/api/members/${encodeURIComponent(membershipId)}`, {
        method: "PATCH",
        body: { role },
      }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/members/:id (API §28). */
export function useRemoveMember() {
  const invalidate = useInvalidateMembers();
  return useMutation({
    mutationFn: (membershipId: string) =>
      apiAction(`/api/members/${encodeURIComponent(membershipId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/**
 * DELETE /api/members/:id on your own membership (API §28). Nothing is
 * invalidated: refetching would only answer 403 now. The caller leaves /app,
 * and useCreateWedding drops what is cached about the old wedding.
 */
export function useLeaveWedding() {
  return useMutation({
    mutationFn: (membershipId: string) =>
      apiAction(`/api/members/${encodeURIComponent(membershipId)}`, { method: "DELETE" }),
  });
}

/** The signed-in invitee joins the wedding (API §26). */
export function useAcceptMemberInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<AcceptMemberInvitationResultDto>(
        `/api/member-invitations/${encodeURIComponent(token)}/accept`,
        { method: "POST" },
      ),
    // The user now has a wedding: anything cached about "me" is stale.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}
