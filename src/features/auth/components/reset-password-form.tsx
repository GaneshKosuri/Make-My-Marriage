"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CircleCheck, Clock, Lock, TimerOff } from "lucide-react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { resetPasswordSchema } from "@/modules/auth/auth.schemas";

import { applyFieldErrors, errorCode, useResetPassword } from "../api";
import { AUTH_ROUTES, GENERIC_ERROR, RESET_LINK_NOTE, RESET_PASSWORD } from "../auth-content";
import { AuthCard, AuthNote } from "./auth-shell";
import {
  FormAlert,
  PasswordField,
  SubmitButton,
  primaryButtonClass,
  secondaryButtonClass,
} from "./form-controls";
import { PasswordStrengthMeter } from "./password-strength-meter";

/** The API takes { token, password }; the form also asks for a confirmation. */
const resetPasswordFormSchema = z
  .object({
    password: resetPasswordSchema.shape.password,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .strict()
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

/** /reset-password/[token] — set a new password from the emailed link (API_DESIGN §16). */
export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const reset = useResetPassword();
  const form = useForm({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(({ password: newPassword }) =>
    reset.mutate(
      { token, password: newPassword },
      { onError: (error) => applyFieldErrors(error, form.setError, ["password"]) },
    ),
  );

  if (reset.isSuccess) {
    return (
      <AuthCard
        centered
        icon={<CircleCheck aria-hidden />}
        title={RESET_PASSWORD.success.title}
        description={RESET_PASSWORD.success.description}
      >
        <Link href={AUTH_ROUTES.signIn} className={primaryButtonClass}>
          {RESET_PASSWORD.success.action}
          <ArrowRight aria-hidden />
        </Link>
      </AuthCard>
    );
  }

  const code = reset.isError ? errorCode(reset.error) : null;
  if (code === "TOKEN_EXPIRED" || code === "INVALID_TOKEN") {
    const copy = code === "TOKEN_EXPIRED" ? RESET_PASSWORD.expired : RESET_PASSWORD.invalid;
    return (
      <AuthCard icon={<TimerOff aria-hidden />} title={copy.title} description={copy.description}>
        <div className="flex flex-col gap-3">
          <Link href={AUTH_ROUTES.forgotPassword} className={primaryButtonClass}>
            {RESET_PASSWORD.requestNew}
            <ArrowRight aria-hidden />
          </Link>
          <Link href={AUTH_ROUTES.signIn} className={secondaryButtonClass}>
            <ArrowLeft aria-hidden />
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <>
      {reset.isError && code !== "VALIDATION_ERROR" && (
        <FormAlert title={code === "RATE_LIMITED" ? "Too many attempts." : GENERIC_ERROR.title}>
          {code === "RATE_LIMITED"
            ? "Please wait a few minutes and try again."
            : GENERIC_ERROR.description}
        </FormAlert>
      )}
      <AuthCard title={RESET_PASSWORD.title} description={RESET_PASSWORD.description}>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <PasswordField
            label={RESET_PASSWORD.newPassword}
            autoComplete="new-password"
            icon={<Lock aria-hidden />}
            error={errors.password?.message}
            hint={<PasswordStrengthMeter password={password} />}
            {...form.register("password")}
          />
          <PasswordField
            label={RESET_PASSWORD.confirmPassword}
            autoComplete="new-password"
            icon={<Lock aria-hidden />}
            error={errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />
          <SubmitButton pending={reset.isPending} pendingLabel={RESET_PASSWORD.pending}>
            {RESET_PASSWORD.submit}
          </SubmitButton>
        </form>
      </AuthCard>
      <AuthNote icon={<Clock aria-hidden />}>{RESET_LINK_NOTE}</AuthNote>
    </>
  );
}
