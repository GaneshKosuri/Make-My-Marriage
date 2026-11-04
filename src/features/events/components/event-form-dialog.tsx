"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, RefreshCw, Shirt } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import {
  FormAlert,
  OptionalTag,
  TextAreaField,
  TextField,
} from "@/features/auth/components/form-controls";
import { focusRing, primaryButton } from "@/features/dashboard/components/dashboard-card";
import { Dialog } from "@/features/members/components/dialog";
import { timeZoneLabel } from "@/features/weddings/create-wedding-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import type { DateOnly } from "@/lib/dates";
import { EVENT_TYPE_LABELS, EVENT_TYPES, type EventType } from "@/modules/events/event.constants";
import type { EventDto } from "@/modules/events/event.types";

import { useCreateEvent, useUpdateEvent } from "../api";
import {
  emptyEventForm,
  endsNextDay,
  eventFormSchema,
  eventToForm,
  SERVER_FIELD_FOR,
  toCreateEventBody,
  toUpdateEventBody,
  type EventFormValues,
} from "../event-form";
import { EVENTS } from "../events-content";
import { eventsKeys } from "../query-keys";

const FORM = EVENTS.form;
const FIELDS = FORM.fields;

const secondaryButton = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-sand bg-white px-5 text-label-md text-graphite hover:bg-sand disabled:opacity-60",
  focusRing,
);

/** Preset names a type chip may overwrite: a name the person typed is kept. */
const PRESET_NAMES = new Set<string>(
  EVENT_TYPES.filter((type) => type !== "CUSTOM").map((type) => EVENT_TYPE_LABELS[type]),
);

export interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The event being edited; adds a new one when absent. */
  event?: EventDto;
  /** Pre-selected occasion for a new event (the empty state's suggestions). */
  initialType?: EventType;
  timeZone: string;
  weddingDate: DateOnly;
  /** Today in the wedding's time zone. */
  today: DateOnly;
  onSaved: (event: EventDto) => void;
}

/**
 * Add or edit an event (PRD §9.5) in the dashboard dialog: a bottom sheet on
 * phones, a centred card from `md` up. Edits send only what changed, with the
 * version the form was loaded at, so someone else's newer change is never overwritten.
 */
export function EventFormDialog(props: Readonly<EventFormDialogProps>) {
  const { open, onClose, event, timeZone } = props;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={event ? FORM.editTitle : FORM.addTitle}
      description={FORM.description(timeZoneLabel(timeZone))}
    >
      {/* A reloaded event (new version) starts a fresh form. */}
      <EventForm key={event ? `${event.id}:${event.version}` : "new"} {...props} />
    </Dialog>
  );
}

function EventForm({
  onClose,
  event,
  initialType,
  timeZone,
  weddingDate,
  today,
  onSaved,
}: Readonly<EventFormDialogProps>) {
  const queryClient = useQueryClient();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const mutation = event ? update : create;

  const form = useForm({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? eventToForm(event, timeZone)
      : {
          ...emptyEventForm(weddingDate, today),
          ...(initialType ? { type: initialType, name: presetName(initialType) } : {}),
        },
  });
  const { errors, dirtyFields, isDirty } = form.formState;
  const [startTime, endTime] = useWatch({ control: form.control, name: ["startTime", "endTime"] });

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) return;
    for (const [field, message] of Object.entries(error.details)) {
      const target = SERVER_FIELD_FOR[field as keyof typeof SERVER_FIELD_FOR];
      if (target) form.setError(target, { type: "server", message }, { shouldFocus: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (event) {
      update.mutate(
        {
          eventId: event.id,
          body: toUpdateEventBody(values, dirtyFields, timeZone, event.version),
        },
        { onSuccess: onSaved, onError },
      );
    } else {
      create.mutate(toCreateEventBody(values, timeZone), { onSuccess: onSaved, onError });
    }
  });

  const typeField = form.register("type", {
    onChange: (change: { target: { value: string } }) => {
      const name = form.getValues("name").trim();
      if (name !== "" && !PRESET_NAMES.has(name)) return;
      const next = presetName(change.target.value as EventType);
      if (next !== name) form.setValue("name", next, { shouldDirty: true });
    },
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <SaveProblem
        error={mutation.error}
        onReload={() => void queryClient.invalidateQueries({ queryKey: eventsKeys.all })}
      />

      <fieldset>
        <legend className="mb-2 text-label-md text-graphite">{FORM.typeLegend}</legend>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((type) => (
            <label key={type} className="cursor-pointer">
              <input type="radio" value={type} className="peer sr-only" {...typeField} />
              <span
                className={cn(
                  "inline-flex h-9 items-center rounded-full border border-sand bg-white px-3.5 text-label-md text-graphite hover:bg-sand",
                  "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                )}
              >
                {EVENT_TYPE_LABELS[type]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        label={FIELDS.name.label}
        autoComplete="off"
        placeholder={FIELDS.name.placeholder}
        error={errors.name?.message}
        {...form.register("name")}
      />

      <TextField
        label={FIELDS.date.label}
        type="date"
        error={errors.date?.message}
        {...form.register("date")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={FIELDS.startTime.label}
          type="time"
          error={errors.startTime?.message}
          {...form.register("startTime")}
        />
        <TextField
          label={FIELDS.endTime.label}
          labelAside={<OptionalTag />}
          type="time"
          error={errors.endTime?.message}
          hint={
            endsNextDay(startTime, endTime) && (
              <p className="text-body-sm text-plum">{FORM.endsNextDay}</p>
            )
          }
          {...form.register("endTime")}
        />
      </div>

      <TextField
        label={FIELDS.venueName.label}
        labelAside={<OptionalTag />}
        autoComplete="off"
        placeholder={FIELDS.venueName.placeholder}
        icon={<MapPin aria-hidden />}
        error={errors.venueName?.message}
        {...form.register("venueName")}
      />
      <TextField
        label={FIELDS.address.label}
        labelAside={<OptionalTag />}
        autoComplete="off"
        placeholder={FIELDS.address.placeholder}
        error={errors.address?.message}
        {...form.register("address")}
      />
      <TextField
        label={FIELDS.dressCode.label}
        labelAside={<OptionalTag />}
        autoComplete="off"
        placeholder={FIELDS.dressCode.placeholder}
        icon={<Shirt aria-hidden />}
        error={errors.dressCode?.message}
        {...form.register("dressCode")}
      />
      <TextAreaField
        label={FIELDS.description.label}
        labelAside={<OptionalTag />}
        rows={3}
        placeholder={FIELDS.description.placeholder}
        error={errors.description?.message}
        {...form.register("description")}
      />

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1">
        <button type="button" onClick={onClose} className={secondaryButton}>
          {FORM.cancel}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || (event !== undefined && !isDirty)}
          aria-busy={mutation.isPending || undefined}
          className={cn(primaryButton, "disabled:opacity-60")}
        >
          {mutation.isPending ? FORM.saving : FORM.save}
        </button>
      </div>
    </form>
  );
}

/** The type's name, or blank for a custom event (the person names it). */
function presetName(type: EventType | ""): EventFormValues["name"] {
  return type && type !== "CUSTOM" ? EVENT_TYPE_LABELS[type] : "";
}

/** Field problems show on the fields; everything else gets one banner. */
function SaveProblem({ error, onReload }: Readonly<{ error: unknown; onReload: () => void }>) {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR" && error.details) return null;
    if (error.code === "CONFLICT") {
      return (
        <FormAlert title={FORM.conflict.title}>
          <p>{FORM.conflict.description}</p>
          <button
            type="button"
            onClick={onReload}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded font-semibold text-burgundy underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            <RefreshCw aria-hidden className="size-4" />
            {FORM.conflict.action}
          </button>
        </FormAlert>
      );
    }
    if (error.code === "NOT_FOUND") {
      return <FormAlert title={FORM.gone.title}>{FORM.gone.description}</FormAlert>;
    }
  }
  return <FormAlert title={FORM.error.title}>{FORM.error.description}</FormAlert>;
}
