"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { signupSchema } from "@/modules/auth/auth.schemas";

import { applyFieldErrors, errorCode, useSignup } from "../api";
import { AUTH_ROUTES, GENERIC_ERROR, SIGN_UP } from "../auth-content";
import { AuthCard } from "./auth-shell";
import { FormAlert, PasswordField, SubmitButton, TextField } from "./form-controls";
import { PasswordStrengthMeter } from "./password-strength-meter";

const linkClass =
  "rounded font-semibold text-burgundy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

/** /signup — name, email, password; signs the user in (PRD §9.1, API_DESIGN §11). */
export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit((values) =>
    signup.mutate(values, {
      // A new account never has a wedding yet (PRD §9.2).
      onSuccess: () => router.replace(AUTH_ROUTES.createWedding),
      onError: (error) => applyFieldErrors(error, form.setError, ["name", "email", "password"]),
    }),
  );

  const pending = signup.isPending || signup.isSuccess;

  return (
    <>
      {signup.isError && <SignupAlert error={signup.error} />}
      <AuthCard
        eyebrow={SIGN_UP.eyebrow}
        title={SIGN_UP.title}
        description={
          <>
            {SIGN_UP.description}{" "}
            <span className="mt-1 block">
              {SIGN_UP.alreadyHaveAccount}{" "}
              <Link href={AUTH_ROUTES.signIn} className={linkClass}>
                {SIGN_UP.signIn}
              </Link>
            </span>
          </>
        }
      >
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <TextField
            label="Full name"
            autoComplete="name"
            placeholder={SIGN_UP.namePlaceholder}
            icon={<UserRound aria-hidden />}
            error={errors.name?.message}
            {...form.register("name")}
          />
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
            autoComplete="new-password"
            placeholder={SIGN_UP.passwordPlaceholder}
            icon={<Lock aria-hidden />}
            error={errors.password?.message}
            hint={<PasswordStrengthMeter password={password} />}
            {...form.register("password")}
          />
          <SubmitButton
            pending={pending}
            pendingLabel={SIGN_UP.pending}
            icon={<ArrowRight aria-hidden />}
          >
            {SIGN_UP.submit}
          </SubmitButton>
        </form>
      </AuthCard>
    </>
  );
}

function SignupAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null; // shown on the fields
    case "EMAIL_ALREADY_EXISTS":
      return (
        <FormAlert title={SIGN_UP.emailTaken.title}>
          <Link href={AUTH_ROUTES.signIn} className={linkClass}>
            {SIGN_UP.emailTaken.action}
          </Link>
        </FormAlert>
      );
    case "RATE_LIMITED":
      return (
        <FormAlert title={SIGN_UP.tooManyAttempts.title}>
          {SIGN_UP.tooManyAttempts.description}
        </FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}
