"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { AcceptMemberInvitationResultDto } from "@/modules/members/member.types";

import { authKeys } from "@/features/auth/query-keys";

/** TanStack Query hooks over the Wedding Members REST API (API_DESIGN §21–28). */

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
