"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Globe, Heart, MapPin, RefreshCw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { SettingsTabs } from "@/components/layout/settings-tabs";
import { applyFieldErrors } from "@/features/auth/api";
import {
  FormAlert,
  OptionalTag,
  TextAreaField,
  TextField,
} from "@/features/auth/components/form-controls";
import {
  DashboardCard,
  focusRing,
  primaryButton,
} from "@/features/dashboard/components/dashboard-card";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { coupleDisplayName } from "@/lib/couple";
import { dateOnlyInTimeZone } from "@/lib/dates";
import { updateWeddingSchema } from "@/modules/weddings/wedding.schemas";
import type { UpdateWeddingInput, WeddingDto } from "@/modules/weddings/wedding.types";

import { useUpdateWedding, useWedding } from "../api";
import { CREATE_WEDDING } from "../create-wedding-content";
import { WEDDING_DETAILS } from "../wedding-details-content";
import { TimeZoneSelect } from "./time-zone-select";

const FIELDS = CREATE_WEDDING.fields;
const TOP_LEVEL = [
  "brideName",
  "groomName",
  "title",
  "description",
  "weddingDate",
  "timeZone",
] as const;
const SERVER_FIELDS = [
  ...TOP_LEVEL,
  "location.city",
  "location.state",
  "location.country",
] as const;

/** Every field as the form edits it: plain strings, blank for "not set". */
function toFormValues(wedding: WeddingDto): z.input<typeof updateWeddingSchema> {
  return {
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title ?? "",
    description: wedding.description ?? "",
    weddingDate: wedding.weddingDate,
    timeZone: wedding.timeZone,
    location: {
      city: wedding.location.city ?? "",
      state: wedding.location.state ?? "",
      country: wedding.location.country ?? "",
    },
  };
}

/**
 * Settings → Wedding Details (PRD §9.25, API_DESIGN §19): Admins and Managers
 * edit the couple, date, place and description. Only changed fields are sent,
 * so two people editing different fields don't overwrite each other.
 */
export function WeddingDetailsScreen() {
  const wedding = useWedding();

  let body;
  if (wedding.data) {
    // Keyed by id so a refetched wedding starts a fresh form.
    body = <DetailsForm key={wedding.data.id} wedding={wedding.data} />;
  } else if (wedding.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{WEDDING_DETAILS.loadError.title}</p>
        <button
          type="button"
          onClick={() => void wedding.refetch()}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border border-sand bg-white px-4 text-label-md text-graphite hover:bg-sand",
            focusRing,
          )}
        >
          <RefreshCw aria-hidden className={cn("size-4", wedding.isFetching && "animate-spin")} />
          {WEDDING_DETAILS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <FormSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header>
        <p className="text-eyebrow text-gold-deep uppercase">{WEDDING_DETAILS.eyebrow}</p>
        <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
          {WEDDING_DETAILS.title}
        </h1>
        <p className="mt-1 text-body-md text-plum">{WEDDING_DETAILS.description}</p>
      </header>
      <SettingsTabs />
      {body}
    </div>
  );
}

function DetailsForm({ wedding }: Readonly<{ wedding: WeddingDto }>) {
  const router = useRouter();
  const update = useUpdateWedding();
  const [saved, setSaved] = useState(false);
  const form = useForm({
    resolver: zodResolver(updateWeddingSchema),
    defaultValues: toFormValues(wedding),
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const [brideName, groomName, timeZone] = useWatch({
    control: form.control,
    name: ["brideName", "groomName", "timeZone"],
  });

  const onSubmit = form.handleSubmit((values) => {
    const changes: UpdateWeddingInput = {};
    for (const field of TOP_LEVEL) {
      if (dirtyFields[field]) changes[field] = values[field];
    }
    if (dirtyFields.location) changes.location = values.location;

    setSaved(false);
    update.mutate(changes, {
      onSuccess: (updated) => {
        form.reset(toFormValues(updated));
        setSaved(true);
        // The header shows the couple, date and place from the server session.
        router.refresh();
      },
      onError: (error) => applyFieldErrors(error, form.setError, SERVER_FIELDS),
    });
  });

  const defaultTitle = coupleDisplayName({
    brideName: brideName?.trim() || wedding.brideName,
    groomName: groomName?.trim() || wedding.groomName,
  });
  // Field problems show on the fields; anything else gets the banner.
  const showSaveError =
    update.isError &&
    !(
      update.error instanceof ApiError &&
      update.error.code === "VALIDATION_ERROR" &&
      update.error.details
    );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 md:gap-6">
      {saved && !isDirty && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {WEDDING_DETAILS.saved}
        </p>
      )}
      {showSaveError && (
        <FormAlert title={WEDDING_DETAILS.saveError.title}>
          {WEDDING_DETAILS.saveError.description}
        </FormAlert>
      )}

      <DashboardCard title={WEDDING_DETAILS.coupleSection}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={FIELDS.brideName.label}
              autoComplete="off"
              icon={<Heart aria-hidden />}
              error={errors.brideName?.message}
              {...form.register("brideName")}
            />
            <TextField
              label={FIELDS.groomName.label}
              autoComplete="off"
              icon={<UserRound aria-hidden />}
              error={errors.groomName?.message}
              {...form.register("groomName")}
            />
          </div>
          <TextField
            label={FIELDS.title.label}
            labelAside={<OptionalTag />}
            autoComplete="off"
            placeholder={defaultTitle}
            error={errors.title?.message}
            hint={<p className="text-body-sm text-plum">{FIELDS.title.hint}</p>}
            {...form.register("title")}
          />
        </div>
      </DashboardCard>

      <DashboardCard title={WEDDING_DETAILS.dateSection}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={FIELDS.weddingDate.label}
              type="date"
              min={dateOnlyInTimeZone(new Date(), timeZone || wedding.timeZone)}
              error={errors.weddingDate?.message}
              {...form.register("weddingDate")}
            />
            <TimeZoneSelect
              error={errors.timeZone?.message}
              registration={form.register("timeZone")}
              current={wedding.timeZone}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label={FIELDS.city.label}
              autoComplete="address-level2"
              placeholder={FIELDS.city.placeholder}
              icon={<MapPin aria-hidden />}
              error={errors.location?.city?.message}
              {...form.register("location.city")}
            />
            <TextField
              label={FIELDS.state.label}
              labelAside={<OptionalTag />}
              autoComplete="address-level1"
              placeholder={FIELDS.state.placeholder}
              error={errors.location?.state?.message}
              {...form.register("location.state")}
            />
          </div>
          <TextField
            label={FIELDS.country.label}
            labelAside={<OptionalTag />}
            autoComplete="country-name"
            error={errors.location?.country?.message}
            {...form.register("location.country")}
          />
        </div>
      </DashboardCard>

      <DashboardCard title={WEDDING_DETAILS.aboutSection}>
        <div className="flex flex-col gap-5">
          <TextAreaField
            label={FIELDS.description.label}
            labelAside={<OptionalTag />}
            rows={4}
            placeholder={FIELDS.description.placeholder}
            error={errors.description?.message}
            {...form.register("description")}
          />
          <div className="flex gap-3 rounded-2xl bg-sand p-4 text-body-sm text-plum">
            <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
            <div>
              <p className="text-label-md text-graphite">{WEDDING_DETAILS.websiteAddress.label}</p>
              <p className="font-mono text-graphite">/w/{wedding.website.slug}</p>
              <p className="mt-1">{WEDDING_DETAILS.websiteAddress.note}</p>
              <p className="mt-1">{WEDDING_DETAILS.coverNote}</p>
            </div>
          </div>
        </div>
      </DashboardCard>

      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 flex flex-col-reverse gap-3 rounded-3xl border border-sand bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:justify-end md:bottom-4">
        <button
          type="button"
          disabled={!isDirty || update.isPending}
          onClick={() => {
            form.reset();
            update.reset();
          }}
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-full border border-sand bg-white px-5 text-label-md text-graphite hover:bg-sand disabled:opacity-50",
            focusRing,
          )}
        >
          {WEDDING_DETAILS.discard}
        </button>
        <button
          type="submit"
          disabled={!isDirty || update.isPending}
          aria-busy={update.isPending || undefined}
          className={cn(primaryButton, "disabled:opacity-60")}
        >
          {update.isPending ? WEDDING_DETAILS.saving : WEDDING_DETAILS.save}
        </button>
      </div>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4 md:gap-6">
      {[0, 1].map((card) => (
        <div
          key={card}
          className="animate-pulse rounded-3xl border border-sand bg-white p-5 md:p-7"
        >
          <div className="h-5 w-40 rounded bg-sand" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="h-12 rounded-xl bg-sand" />
            <div className="h-12 rounded-xl bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}
