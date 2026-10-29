"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Send } from "lucide-react";
import { useForm } from "react-hook-form";

import { applyFieldErrors } from "@/features/auth/api";
import {
  FormAlert,
  SubmitButton,
  TextField,
  secondaryButtonClass,
} from "@/features/auth/components/form-controls";
import { cn } from "@/lib/cn";
import { ApiError } from "@/lib/api-client";
import {
  MEMBER_ROLE_LABELS,
  MEMBER_ROLES,
  type MemberRole,
} from "@/modules/members/member.constants";
import { inviteMemberSchema } from "@/modules/members/member.schemas";
import type { InviteMemberInput } from "@/modules/members/member.types";

import { useInviteMember } from "../api";
import { MEMBERS } from "../members-content";
import { Dialog } from "./dialog";

const COPY = MEMBERS.inviteDialog;
/** Manager first: most invitees help with planning, not member administration. */
const ROLE_ORDER: readonly MemberRole[] = [...MEMBER_ROLES].reverse();

/** "Invite member": email + role (API §22). The email is sent before the dialog closes. */
export function InviteMemberDialog({
  open,
  onClose,
  onInvited,
}: Readonly<{ open: boolean; onClose: () => void; onInvited: (email: string) => void }>) {
  const invite = useInviteMember();
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: "MANAGER" },
  });
  const { errors } = form.formState;

  function close() {
    form.reset();
    invite.reset();
    onClose();
  }

  const onSubmit = form.handleSubmit((values) =>
    invite.mutate(values, {
      onSuccess: (invitation) => {
        onInvited(invitation.email);
        close();
      },
      onError: (error) => {
        // Already a member / already invited: the reason belongs on the email field.
        if (error instanceof ApiError && error.code === "CONFLICT" && error.details?.email) {
          form.setError("email", { type: "server", message: error.details.email });
          return;
        }
        applyFieldErrors(error, form.setError, ["email", "role"]);
      },
    }),
  );

  return (
    <Dialog open={open} onClose={close} title={COPY.title} description={COPY.description}>
      {invite.isError && <InviteAlert error={invite.error} />}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label={COPY.email}
          type="email"
          autoComplete="off"
          inputMode="email"
          placeholder="name@example.com"
          icon={<Mail aria-hidden />}
          error={errors.email?.message}
          {...form.register("email")}
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label-md text-graphite">{COPY.role}</legend>
          {ROLE_ORDER.map((role) => (
            <label
              key={role}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border border-sand bg-white p-3",
                "has-[:checked]:border-burgundy has-[:checked]:ring-[3px] has-[:checked]:ring-burgundy/10",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-burgundy",
              )}
            >
              <input
                type="radio"
                value={role}
                className="mt-1 size-4 accent-burgundy"
                {...form.register("role")}
              />
              <span>
                <span className="block text-label-md text-graphite">
                  {MEMBER_ROLE_LABELS[role]}
                </span>
                <span className="block text-body-sm text-plum">{COPY.roleHints[role]}</span>
              </span>
            </label>
          ))}
          {errors.role?.message && (
            <p className="text-body-sm text-destructive">{errors.role.message}</p>
          )}
        </fieldset>
        <div className="flex flex-col-reverse gap-3 md:flex-row">
          <button type="button" onClick={close} className={secondaryButtonClass}>
            {COPY.cancel}
          </button>
          <SubmitButton
            pending={invite.isPending}
            pendingLabel={COPY.pending}
            icon={<Send aria-hidden />}
          >
            {COPY.submit}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

function InviteAlert({ error }: Readonly<{ error: unknown }>) {
  const code = error instanceof ApiError ? error.code : null;
  const onField = error instanceof ApiError && Boolean(error.details);
  switch (code) {
    case "VALIDATION_ERROR":
    case "CONFLICT":
      if (onField) return null; // shown on the fields
      break;
    case "EXTERNAL_SERVICE_ERROR":
      return <FormAlert title={COPY.emailFailed.title}>{COPY.emailFailed.description}</FormAlert>;
    case "RATE_LIMITED":
      return (
        <FormAlert title={MEMBERS.tooManyInvites.title}>
          {MEMBERS.tooManyInvites.description}
        </FormAlert>
      );
  }
  return (
    <FormAlert title={MEMBERS.genericError.title}>{MEMBERS.genericError.description}</FormAlert>
  );
}
