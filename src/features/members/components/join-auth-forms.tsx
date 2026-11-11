"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, UserRound } from "lucide-react";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyFieldErrors, errorCode, useLogin, useSignup } from "@/features/auth/api";
import { GENERIC_ERROR, PASSWORD_HINT, SIGN_UP } from "@/features/auth/auth-content";
import {
  FormAlert,
  PasswordField,
  SubmitButton,
  TextField,
} from "@/features/auth/components/form-controls";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import { cn } from "@/lib/cn";
import { loginSchema, signupSchema } from "@/modules/auth/auth.schemas";
import type { AuthResultDto } from "@/modules/auth/auth.types";

import { JOIN } from "../join-content";

type Tab = "signup" | "signin";

const linkButtonClass =
  "rounded font-semibold text-burgundy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/**
 * Sign up or sign in without leaving /join/[token]. The email is the invited
 * address and cannot be changed: accepting checks that it matches. On success
 * the screen accepts the invitation (`onSignedIn`).
 */
export function JoinAuthForms({
  email,
  onSignedIn,
}: Readonly<{ email: string; onSignedIn: (result: AuthResultDto) => void }>) {
  const [tab, setTab] = useState<Tab>("signup");
  return (
    <div>
      <div
        role="tablist"
        aria-label="Join with"
        className="mb-6 grid grid-cols-2 rounded-full bg-sand p-1"
      >
        {(
          [
            ["signup", JOIN.createAccountTab],
            ["signin", JOIN.signInTab],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-11 min-w-0 rounded-full px-2 text-label-md leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
              tab === value ? "bg-white text-graphite shadow-sm" : "text-plum hover:text-graphite",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "signup" ? (
          <JoinSignupForm email={email} onSignedIn={onSignedIn} onSignIn={() => setTab("signin")} />
        ) : (
          <JoinLoginForm email={email} onSignedIn={onSignedIn} />
        )}
      </div>
    </div>
  );
}

/**
 * The invited address, shown as wrapping text so a long email is never cut off on
 * phones (QA 2026-11-03). A visually hidden read-only input keeps it available to
 * password managers as the account the password belongs to.
 */
function LockedEmail({ email }: Readonly<{ email: string }>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-label-md text-graphite">
        Email address
      </span>
      <p className="flex items-start gap-3 rounded-xl border border-sand bg-ivory px-4 py-3 text-body-md break-all text-graphite">
        <Mail aria-hidden className="mt-0.5 size-[18px] shrink-0 text-plum" />
        <span>{email}</span>
      </p>
      <input
        type="email"
        name="email"
        value={email}
        readOnly
        autoComplete="username"
        aria-labelledby={`${id}-label`}
        tabIndex={-1}
        className="sr-only"
      />
      <p className="text-body-sm text-plum">{JOIN.emailLocked}</p>
    </div>
  );
}

function JoinSignupForm({
  email,
  onSignedIn,
  onSignIn,
}: Readonly<{
  email: string;
  onSignedIn: (result: AuthResultDto) => void;
  onSignIn: () => void;
}>) {
  const signup = useSignup();
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email, password: "" },
  });
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit((values) =>
    signup.mutate(
      { ...values, email },
      {
        onSuccess: onSignedIn,
        onError: (error) => applyFieldErrors(error, form.setError, ["name", "password"]),
      },
    ),
  );

  return (
    <>
      <p className="mb-5 text-body-md text-plum">{JOIN.signUpIntro}</p>
      {signup.isError && <SignupAlert error={signup.error} onSignIn={onSignIn} />}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <TextField
          label="Full name"
          autoComplete="name"
          placeholder={SIGN_UP.namePlaceholder}
          icon={<UserRound aria-hidden />}
          error={errors.name?.message}
          {...form.register("name")}
        />
        <LockedEmail email={email} />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          placeholder={PASSWORD_HINT}
          icon={<Lock aria-hidden />}
          error={errors.password?.message}
          hint={<PasswordStrengthMeter password={password} />}
          {...form.register("password")}
        />
        <SubmitButton
          pending={signup.isPending || signup.isSuccess}
          pendingLabel={JOIN.creating}
          icon={<ArrowRight aria-hidden />}
        >
          {JOIN.createAndJoin}
        </SubmitButton>
      </form>
    </>
  );
}

function SignupAlert({ error, onSignIn }: Readonly<{ error: unknown; onSignIn: () => void }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null; // shown on the fields
    case "EMAIL_ALREADY_EXISTS":
      return (
        <FormAlert title={JOIN.emailTaken.title}>
          <button type="button" onClick={onSignIn} className={linkButtonClass}>
            {JOIN.emailTaken.action}
          </button>
        </FormAlert>
      );
    case "RATE_LIMITED":
      return (
        <FormAlert title={JOIN.tooManyAttempts.title}>{JOIN.tooManyAttempts.description}</FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}

function JoinLoginForm({
  email,
  onSignedIn,
}: Readonly<{ email: string; onSignedIn: (result: AuthResultDto) => void }>) {
  const login = useLogin();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email, password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) =>
    login.mutate(
      { ...values, email },
      {
        onSuccess: onSignedIn,
        onError: (error) => applyFieldErrors(error, form.setError, ["password"]),
      },
    ),
  );

  return (
    <>
      <p className="mb-5 text-body-md text-plum">{JOIN.signInIntro}</p>
      {login.isError && <LoginAlert error={login.error} />}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <LockedEmail email={email} />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          placeholder="Password"
          icon={<Lock aria-hidden />}
          error={errors.password?.message}
          {...form.register("password")}
        />
        <SubmitButton
          pending={login.isPending || login.isSuccess}
          pendingLabel={JOIN.signingIn}
          icon={<ArrowRight aria-hidden />}
        >
          {JOIN.signInAndJoin}
        </SubmitButton>
      </form>
    </>
  );
}

function LoginAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null; // shown on the fields
    case "UNAUTHENTICATED":
      return (
        <FormAlert title={JOIN.invalidCredentials.title}>
          {JOIN.invalidCredentials.description}
        </FormAlert>
      );
    case "RATE_LIMITED":
      return (
        <FormAlert title={JOIN.tooManyAttempts.title}>{JOIN.tooManyAttempts.description}</FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}
