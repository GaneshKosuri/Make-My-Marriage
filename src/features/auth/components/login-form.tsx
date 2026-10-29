"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { loginSchema } from "@/modules/auth/auth.schemas";

import { applyFieldErrors, errorCode, useLogin } from "../api";
import { AUTH_ROUTES, GENERIC_ERROR, SIGN_IN } from "../auth-content";
import { AuthCard, AuthNote } from "./auth-shell";
import { FormAlert, PasswordField, SubmitButton, TextField } from "./form-controls";

const linkClass =
  "rounded font-semibold text-burgundy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** /login — email + password (PRD §9.1, API_DESIGN §12). */
export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ hasWedding }) =>
        router.replace(hasWedding ? AUTH_ROUTES.app : AUTH_ROUTES.createWedding),
      onError: (error) => applyFieldErrors(error, form.setError, ["email", "password"]),
    }),
  );

  // Keep the button busy while the next page loads after a successful sign-in.
  const pending = login.isPending || login.isSuccess;

  return (
    <>
      {login.isError && <LoginAlert error={login.error} />}
      <AuthCard title={SIGN_IN.title} description={SIGN_IN.description}>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            icon={<Mail aria-hidden />}
            error={errors.email?.message}
            {...form.register("email")}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            icon={<Lock aria-hidden />}
            error={errors.password?.message}
            labelAside={
              <Link href={AUTH_ROUTES.forgotPassword} className={`text-body-sm ${linkClass}`}>
                {SIGN_IN.forgotPassword}
              </Link>
            }
            {...form.register("password")}
          />
          <SubmitButton
            pending={pending}
            pendingLabel={SIGN_IN.pending}
            icon={<ArrowRight aria-hidden />}
          >
            {SIGN_IN.submit}
          </SubmitButton>
        </form>
        <p className="mt-6 text-center text-body-md text-plum">
          {SIGN_IN.newHere}{" "}
          <Link href={AUTH_ROUTES.signUp} className={linkClass}>
            {SIGN_IN.createAccount}
          </Link>
        </p>
      </AuthCard>
      <AuthNote icon={<MailCheck aria-hidden />} title={SIGN_IN.guestNote.title}>
        {SIGN_IN.guestNote.description}
      </AuthNote>
    </>
  );
}

function LoginAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null; // shown on the fields
    case "UNAUTHENTICATED":
      return (
        <FormAlert title={SIGN_IN.invalidCredentials.title}>
          {SIGN_IN.invalidCredentials.description}
        </FormAlert>
      );
    case "RATE_LIMITED":
      return (
        <FormAlert title={SIGN_IN.tooManyAttempts.title}>
          {SIGN_IN.tooManyAttempts.description}
        </FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}
