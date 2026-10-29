"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Clock, Heart, MapPin, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { applyFieldErrors, errorCode } from "@/features/auth/api";
import { AUTH_ROUTES, GENERIC_ERROR } from "@/features/auth/auth-content";
import { AuthCard, AuthNote, AuthShell } from "@/features/auth/components/auth-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import {
  FormAlert,
  OptionalTag,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/features/auth/components/form-controls";
import { coupleDisplayName } from "@/lib/couple";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { DEFAULT_COUNTRY, DEFAULT_TIME_ZONE } from "@/modules/weddings/wedding.constants";
import { createWeddingSchema } from "@/modules/weddings/wedding.schemas";

import { useCreateWedding } from "../api";
import { CREATE_WEDDING, timeZoneLabel } from "../create-wedding-content";
import { TimeZoneSelect } from "./time-zone-select";
import { WeddingPreview } from "./wedding-preview";

const linkClass =
  "rounded font-semibold text-burgundy underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

const SERVER_FIELDS = [
  "brideName",
  "groomName",
  "title",
  "description",
  "weddingDate",
  "timeZone",
  "location.city",
  "location.state",
  "location.country",
] as const;

/**
 * /create-wedding — the first screen after sign-up (PRD §9.2, API_DESIGN §17).
 * The creator becomes the wedding's first Admin, then lands on the dashboard.
 */
export function CreateWeddingScreen({ userName }: Readonly<{ userName: string }>) {
  const router = useRouter();
  const createWedding = useCreateWedding();
  const form = useForm({
    resolver: zodResolver(createWeddingSchema),
    defaultValues: {
      brideName: "",
      groomName: "",
      title: "",
      description: "",
      weddingDate: "",
      timeZone: DEFAULT_TIME_ZONE,
      location: { city: "", state: "", country: DEFAULT_COUNTRY },
    },
  });
  const { errors } = form.formState;
  const [editTimeZone, setEditTimeZone] = useState(false);

  const [brideName, groomName, title, weddingDate, timeZone, city, state] = useWatch({
    control: form.control,
    name: [
      "brideName",
      "groomName",
      "title",
      "weddingDate",
      "timeZone",
      "location.city",
      "location.state",
    ],
  });
  const zone = timeZone ?? DEFAULT_TIME_ZONE;
  const preview = {
    brideName,
    groomName,
    title: title ?? "",
    weddingDate,
    timeZone: zone,
    city,
    state: state ?? "",
  };

  const onSubmit = form.handleSubmit((values) =>
    createWedding.mutate(values, {
      onSuccess: () => router.replace(AUTH_ROUTES.app),
      onError: (error) => {
        applyFieldErrors(error, form.setError, SERVER_FIELDS);
        if (errorCode(error) === "VALIDATION_ERROR") setEditTimeZone(true);
      },
    }),
  );
  const pending = createWedding.isPending || createWedding.isSuccess;
  // Same name order as the rest of the app; the sample couple fills any blank name.
  const defaultTitle = coupleDisplayName({
    brideName: brideName.trim() || "Juliet",
    groomName: groomName.trim() || "Romeo",
  });

  return (
    <AuthShell
      wide
      panel={
        <>
          <WeddingPreview values={preview} />
          <p className="mt-4 flex items-center gap-2 text-body-sm text-plum">
            <ShieldCheck aria-hidden className="size-4 text-gold-deep" />
            {CREATE_WEDDING.adminNote}
          </p>
        </>
      }
      topBar={<SignedInAs userName={userName} />}
    >
      <div className="mb-4 lg:hidden">
        <WeddingPreview values={preview} compact />
      </div>

      {createWedding.isError && <CreateWeddingAlert error={createWedding.error} />}

      <AuthCard
        eyebrow={CREATE_WEDDING.eyebrow}
        title={CREATE_WEDDING.title}
        description={CREATE_WEDDING.description}
      >
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={CREATE_WEDDING.fields.brideName.label}
              autoComplete="off"
              placeholder={CREATE_WEDDING.fields.brideName.placeholder}
              icon={<Heart aria-hidden />}
              error={errors.brideName?.message}
              {...form.register("brideName")}
            />
            <TextField
              label={CREATE_WEDDING.fields.groomName.label}
              autoComplete="off"
              placeholder={CREATE_WEDDING.fields.groomName.placeholder}
              icon={<UserRound aria-hidden />}
              error={errors.groomName?.message}
              {...form.register("groomName")}
            />
          </div>

          <TextField
            label={CREATE_WEDDING.fields.weddingDate.label}
            type="date"
            min={dateOnlyInTimeZone(new Date(), zone)}
            error={errors.weddingDate?.message}
            {...form.register("weddingDate")}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={CREATE_WEDDING.fields.city.label}
              autoComplete="address-level2"
              placeholder={CREATE_WEDDING.fields.city.placeholder}
              icon={<MapPin aria-hidden />}
              error={errors.location?.city?.message}
              {...form.register("location.city")}
            />
            <TextField
              label={CREATE_WEDDING.fields.state.label}
              labelAside={<OptionalTag />}
              autoComplete="address-level1"
              placeholder={CREATE_WEDDING.fields.state.placeholder}
              error={errors.location?.state?.message}
              {...form.register("location.state")}
            />
          </div>

          <TextField
            label={CREATE_WEDDING.fields.country.label}
            labelAside={<OptionalTag />}
            autoComplete="country-name"
            error={errors.location?.country?.message}
            {...form.register("location.country")}
          />

          <TextField
            label={CREATE_WEDDING.fields.title.label}
            labelAside={<OptionalTag />}
            autoComplete="off"
            placeholder={defaultTitle}
            error={errors.title?.message}
            hint={<p className="text-body-sm text-plum">{CREATE_WEDDING.fields.title.hint}</p>}
            {...form.register("title")}
          />

          <TextAreaField
            label={CREATE_WEDDING.fields.description.label}
            labelAside={<OptionalTag />}
            rows={3}
            placeholder={CREATE_WEDDING.fields.description.placeholder}
            error={errors.description?.message}
            {...form.register("description")}
          />

          {editTimeZone ? (
            <TimeZoneSelect
              error={errors.timeZone?.message}
              registration={form.register("timeZone")}
            />
          ) : (
            <p className="flex items-center justify-between gap-3 text-body-sm text-plum">
              <span className="inline-flex items-center gap-2">
                <Clock aria-hidden className="size-4" />
                {CREATE_WEDDING.timeZonePrefix}{" "}
                <span className="font-semibold text-graphite">{timeZoneLabel(zone)}</span>
              </span>
              <button type="button" onClick={() => setEditTimeZone(true)} className={linkClass}>
                {CREATE_WEDDING.changeTimeZone}
              </button>
            </p>
          )}

          <SubmitButton
            pending={pending}
            pendingLabel={CREATE_WEDDING.pending}
            icon={<ArrowRight aria-hidden />}
          >
            {CREATE_WEDDING.submit}
          </SubmitButton>
        </form>
      </AuthCard>

      <AuthNote icon={<Heart aria-hidden />} title={CREATE_WEDDING.invitedNote.title}>
        {CREATE_WEDDING.invitedNote.description}
      </AuthNote>
    </AuthShell>
  );
}

function SignedInAs({ userName }: Readonly<{ userName: string }>) {
  return (
    <p className="text-center text-body-sm text-plum lg:text-right">
      {CREATE_WEDDING.signedInAs} <span className="font-semibold text-graphite">{userName}</span>
      {" · "}
      <SignOutButton className={`${linkClass} disabled:opacity-60`} />
    </p>
  );
}

function CreateWeddingAlert({ error }: Readonly<{ error: unknown }>) {
  switch (errorCode(error)) {
    case "VALIDATION_ERROR":
      return null; // shown on the fields
    case "ALREADY_HAS_WEDDING":
      return (
        <FormAlert title={CREATE_WEDDING.alreadyHasWedding.title}>
          <Link href={AUTH_ROUTES.app} className={linkClass}>
            {CREATE_WEDDING.alreadyHasWedding.action}
          </Link>
        </FormAlert>
      );
    case "UNAUTHENTICATED":
      return (
        <FormAlert title={CREATE_WEDDING.sessionEnded.title}>
          <Link href={AUTH_ROUTES.signIn} className={linkClass}>
            {CREATE_WEDDING.sessionEnded.action}
          </Link>
        </FormAlert>
      );
    default:
      return <FormAlert title={GENERIC_ERROR.title}>{GENERIC_ERROR.description}</FormAlert>;
  }
}
