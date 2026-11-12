"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Shirt } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { DateField, TimeField } from "@/components/ui/date-time-fields";
import { SaveProblem } from "@/components/ui/save-problem";
import { OptionalTag, TextAreaField, TextField, TitleField } from "@/components/ui/form-controls";
import { primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { timeZoneLabel } from "@/features/weddings/create-wedding-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { isValidDateOnly, type DateOnly } from "@/lib/dates";
import { EVENT_TYPE_LABELS, EVENT_TYPES, type EventType } from "@/modules/events/event.constants";
import type { EventDto } from "@/modules/events/event.types";

import { useCreateEvent, useReloadEvent, useUpdateEvent } from "../api";
import {
  emptyEventForm,
  endsNextDay,
  eventFormSchema,
  eventToForm,
  moveEndDate,
  SERVER_FIELD_FOR,
  toCreateEventBody,
  toUpdateEventBody,
  type EventFormValues,
} from "../event-form";
import { EVENTS } from "../events-content";

const FORM = EVENTS.form;
const FIELDS = FORM.fields;

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
  const reloadEvent = useReloadEvent();
  // A copy fetched by "Reload event" after a CONFLICT; `count` starts a fresh form.
  const [reloaded, setReloaded] = useState<{ event: EventDto; count: number } | null>(null);
  const current = reloaded && event && reloaded.event.id === event.id ? reloaded.event : event;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={event ? FORM.editTitle : FORM.addTitle}
      description={FORM.description(timeZoneLabel(timeZone))}
    >
      {/*
        Keyed by id only: a newer copy arriving in the background must not wipe
        what is being typed. Saving then answers CONFLICT, and "Reload event"
        starts a fresh form from the latest copy.
      */}
      <EventForm
        key={current ? `${current.id}:${reloaded?.count ?? 0}` : "new"}
        {...props}
        event={current}
        onReload={async () => {
          if (!current) return;
          const fresh = await reloadEvent(current.id);
          setReloaded((last) => ({ event: fresh, count: (last?.count ?? 0) + 1 }));
        }}
      />
    </Dialog>
  );
}

function EventForm({
  onClose,
  event: eventProp,
  initialType,
  timeZone,
  weddingDate,
  today,
  onSaved,
  onReload,
}: Readonly<EventFormDialogProps & { onReload: () => Promise<void> }>) {
  // The copy this form was opened with: its values and version are what an edit
  // is based on, even if a newer copy arrives meanwhile.
  const [event] = useState(eventProp);
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const mutation = event ? update : create;
  const [reloadFailed, setReloadFailed] = useState(false);

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
  const [date, startTime, endDate, endTime] = useWatch({
    control: form.control,
    name: ["date", "startTime", "endDate", "endTime"],
  });

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

  // Moving the start date moves an end date with it, keeping the event's length.
  const onDateChange = (next: string, setDate: (value: string) => void) => {
    const previous = form.getValues("date");
    const end = form.getValues("endDate");
    setDate(next);
    if (end && isValidDateOnly(previous) && isValidDateOnly(next)) {
      form.setValue("endDate", moveEndDate(end, previous, next), { shouldDirty: true });
    }
  };

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
        error={reloadFailed ? new ApiError(404, "NOT_FOUND", "") : mutation.error}
        onReload={() => void onReload().catch(() => setReloadFailed(true))}
        copy={FORM}
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

      <TitleField
        label={FIELDS.name.label}
        autoComplete="off"
        placeholder={FIELDS.name.placeholder}
        error={errors.name?.message}
        {...form.register("name")}
      />

      {/* One column on phones: a full date plus its 44 px calendar button needs about 190 px, more than half a phone sheet (QA M3). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="date"
          render={({ field }) => (
            <DateField
              label={FIELDS.date.label}
              value={field.value}
              onChange={(next) => onDateChange(next, field.onChange)}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              today={today}
              error={errors.date?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <TimeField
              label={FIELDS.startTime.label}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              error={errors.startTime?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <DateField
              label={FIELDS.endDate.label}
              labelAside={<OptionalTag />}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              min={date || undefined}
              today={today}
              clearable
              error={errors.endDate?.message}
              hint={<p className="text-body-sm text-plum">{FORM.endDateHint}</p>}
            />
          )}
        />
        <Controller
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <TimeField
              label={FIELDS.endTime.label}
              labelAside={<OptionalTag />}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              clearable
              error={errors.endTime?.message}
              hint={
                !endDate &&
                endsNextDay(startTime, endTime) && (
                  <p className="text-body-sm text-plum">{FORM.endsNextDay}</p>
                )
              }
            />
          )}
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

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1 md:pb-0">
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
