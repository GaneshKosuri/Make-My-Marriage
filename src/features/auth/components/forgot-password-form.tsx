"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Clock, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { forgotPasswordSchema } from "@/modules/auth/auth.schemas";

import { applyFieldErrors, errorCode, useForgotPassword } from "../api";
import { AUTH_ROUTES, FORGOT_PASSWORD, GENERIC_ERROR, RESET_LINK_NOTE } from "../auth-content";
import { AuthCard, AuthNote } from "./auth-shell";
import { FormAlert, SubmitButton, TextField, secondaryButtonClass } from "./form-controls";

const linkClass =
  "rounded font-semibold text-burgundy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * /forgot-password — request a reset link (API_DESIGN §15). The confirmation
 * reads the same whether or not the account exists.
 */
export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) =>
    forgot.mutate(values, {
      onSuccess: () => setSentTo(values.email),
      onError: (error) => applyFieldErrors(error, form.setError, ["email"]),
    }),
  );

  if (sentTo) {
    const [before, email, after] = FORGOT_PASSWORD.sent.description(sentTo);
    return (
      <>
        {forgot.isError && <ForgotAlert error={forgot.error} />}
        <AuthCard
          icon={<MailCheck aria-hidden />}
          title={FORGOT_PASSWORD.sent.title}
          description={
            <>
              {before}
              <span className="font-semibold text-graphite">{email}</span>
              {after}
            </>
          }
        >
          <Link href={AUTH_ROUTES.signIn} className={secondaryButtonClass}>
            <ArrowLeft aria-hidden />
            {FORGOT_PASSWORD.back}
          </Link>
          <p className="mt-4 text-center text-body-sm" aria-live="polite">
            {resent && !forgot.isPending && !forgot.isError ? (
              <span className="text-plum">{FORGOT_PASSWORD.sent.resent}</span>
            ) : (
              <button
                type="button"
                disabled={forgot.isPending}
                onClick={() =>
                  forgot.mutate({ email: sentTo }, { onSuccess: () => setResent(true) })
                }
                className={`${linkClass} underline disabled:opacity-60`}
              >
                {FORGOT_PASSWORD.sent.resend}
              </button>
            )}
          </p>
        </AuthCard>
        <AuthNote icon={<Clock aria-hidden />}>{RESET_LINK_NOTE}</AuthNote>
      </>
    );
  }

  return (
    <>
      <Link
        href={AUTH_ROUTES.signIn}
        className={`mb-4 inline-flex items-center gap-2 self-start text-body-md ${linkClass}`}
      >
        <ArrowLeft aria-hidden className="size-4" />
        {FORGOT_PASSWORD.back}
      </Link>
      {forgot.isError && <ForgotAlert error={forgot.error} />}
      <AuthCard title={FORGOT_PASSWORD.title} description={FORGOT_PASSWORD.description}>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            icon={<Mail aria-hidden />}
            error={form.formState.errors.email?.message}
            {...form.register("email")}
          />
          <SubmitButton
            pending={forgot.isPending}
            pendingLabel={FORGOT_PASSWORD.pending}
            icon={<ArrowRight aria-hidden />}
          >
            {FORGOT_PASSWORD.submit}
          </SubmitButton>
        </form>
      </AuthCard>
      <AuthNote icon={<Clock aria-hidden />}>{RESET_LINK_NOTE}</AuthNote>
    </>
  );
}

function ForgotAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null;
    case "RATE_LIMITED":
      return (
        <FormAlert title={FORGOT_PASSWORD.tooManyAttempts.title}>
          {FORGOT_PASSWORD.tooManyAttempts.description}
        </FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}
