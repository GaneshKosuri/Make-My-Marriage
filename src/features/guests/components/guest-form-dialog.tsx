"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  dangerButton,
  focusRing,
  primaryButton,
  secondaryButton,
} from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { OptionalTag, TextAreaField, TextField } from "@/components/ui/form-controls";
import { SaveProblem } from "@/components/ui/save-problem";
import { useEvents } from "@/features/events/api";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { eventDateTile } from "@/lib/schedule";
import type { EventDto } from "@/modules/events/event.types";
import { GUEST_MAX_GUESTS_MAX, GUEST_MAX_GUESTS_MIN } from "@/modules/guests/guest.constants";
import type { GuestDto } from "@/modules/guests/guest.types";

import { useCreateGuest, useDeleteGuest, useReloadGuest, useUpdateGuest } from "../api";
import {
  emptyGuestForm,
  GUEST_SERVER_FIELDS,
  guestFormSchema,
  guestToForm,
  toCreateGuestBody,
  toUpdateGuestBody,
} from "../guest-form";
import { GUESTS } from "../guests-content";

const FORM = GUESTS.form;
const FIELDS = FORM.fields;

export interface GuestFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The guest being edited; adds a new one when absent. */
  guest?: GuestDto;
  timeZone: string;
  onSaved: (guest: GuestDto) => void;
  onDeleted?: (guest: GuestDto) => void;
}

/**
 * Add or edit a guest (PRD §9.7–9.8) in the dashboard sheet. Edits send only
 * what changed, with the version the form was loaded at. Deleting asks first.
 */
export function GuestFormDialog(props: Readonly<GuestFormDialogProps>) {
  const { open, onClose, guest } = props;
  const events = useEvents();
  const reloadGuest = useReloadGuest();
  // A copy fetched by "Reload guest" after a CONFLICT; `count` starts a fresh form.
  const [reloaded, setReloaded] = useState<{ guest: GuestDto; count: number } | null>(null);
  const current = reloaded && guest && reloaded.guest.id === guest.id ? reloaded.guest : guest;

  let body;
  if (events.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-destructive">{FORM.optionsError}</p>
        <button type="button" onClick={() => void events.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {FORM.optionsRetry}
        </button>
      </div>
    );
  } else if (events.data) {
    body = (
      // Keyed by id only: a newer copy arriving in the background must not wipe
      // what is being typed. Saving then answers CONFLICT, and "Reload guest"
      // starts a fresh form from the latest copy.
      <GuestForm
        key={current ? `${current.id}:${reloaded?.count ?? 0}` : "new"}
        {...props}
        guest={current}
        events={events.data}
        onReload={async () => {
          if (!current) return;
          const fresh = await reloadGuest(current.id);
          setReloaded((last) => ({ guest: fresh, count: (last?.count ?? 0) + 1 }));
        }}
      />
    );
  } else {
    body = (
      <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-5">
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-12 rounded-xl bg-sand" />
        <div className="h-24 rounded-xl bg-sand" />
      </div>
    );
  }
  return (
    <Dialog open={open} onClose={onClose} title={guest ? FORM.editTitle : FORM.addTitle}>
      {body}
    </Dialog>
  );
}

function GuestForm({
  onClose,
  guest: guestProp,
  timeZone,
  onSaved,
  onDeleted,
  events,
  onReload,
}: Readonly<
  GuestFormDialogProps & { events: readonly EventDto[]; onReload: () => Promise<void> }
>) {
  // The copy this form was opened with: its values and version are what an edit
  // is based on, even if a newer copy arrives meanwhile.
  const [guest] = useState(guestProp);
  const [initial] = useState(() => (guest ? guestToForm(guest) : emptyGuestForm()));
  const create = useCreateGuest();
  const update = useUpdateGuest();
  const remove = useDeleteGuest();
  const mutation = guest ? update : create;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);

  const form = useForm({ resolver: zodResolver(guestFormSchema), defaultValues: initial });
  const { errors, isDirty } = form.formState;

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) return;
    for (const field of GUEST_SERVER_FIELDS) {
      const message = error.details[field];
      if (message) form.setError(field, { type: "server", message }, { shouldFocus: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (guest) {
      const body = toUpdateGuestBody(values, initial, guest.version);
      if (!body) return onClose();
      update.mutate({ guestId: guest.id, body }, { onSuccess: onSaved, onError });
    } else {
      create.mutate(toCreateGuestBody(values), { onSuccess: onSaved, onError });
    }
  });

  // Archived events stay listed (and can be unticked) on the guest that has them.
  const archivedInvited = (guest?.invitedEvents ?? []).filter((event) => event.archivedAt);
  const choices: EventChoice[] = [
    ...events.map((event) => ({ id: event.id, name: event.name, startsAt: event.startsAt })),
    ...archivedInvited.map((event) => ({
      id: event.id,
      name: GUESTS.archivedEvent(event.name),
      startsAt: event.startsAt,
      archived: true,
    })),
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <SaveProblem
        error={reloadFailed ? new ApiError(404, "NOT_FOUND", "") : (mutation.error ?? remove.error)}
        onReload={() => void onReload().catch(() => setReloadFailed(true))}
        copy={FORM}
      />

      <TextField
        label={FIELDS.name.label}
        autoComplete="off"
        placeholder={FIELDS.name.placeholder}
        error={errors.name?.message}
        {...form.register("name")}
      />

      <Controller
        control={form.control}
        name="maxGuests"
        render={({ field }) => (
          <PartySizeField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            inputRef={field.ref}
            error={errors.maxGuests?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={FIELDS.email.label}
          labelAside={<OptionalTag />}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder={FIELDS.email.placeholder}
          error={errors.email?.message}
          {...form.register("email")}
        />
        <TextField
          label={FIELDS.phone.label}
          labelAside={<OptionalTag />}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder={FIELDS.phone.placeholder}
          error={errors.phone?.message}
          {...form.register("phone")}
        />
      </div>

      <Controller
        control={form.control}
        name="invitedEventIds"
        render={({ field }) => (
          <EventChecklist
            choices={choices}
            value={field.value}
            onChange={field.onChange}
            timeZone={timeZone}
            error={errors.invitedEventIds?.message}
          />
        )}
      />

      <TextAreaField
        label={FIELDS.notes.label}
        labelAside={<OptionalTag />}
        rows={3}
        placeholder={FIELDS.notes.placeholder}
        error={errors.notes?.message}
        {...form.register("notes")}
      />

      {guest && onDeleted && !confirmingDelete && (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 self-start rounded text-label-md text-destructive underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          <Trash2 aria-hidden className="size-4" />
          {FORM.delete}
        </button>
      )}

      {/* The pinned action bar becomes the delete confirmation while it is asked (QA M8). */}
      {guest && onDeleted && confirmingDelete ? (
        <div
          role="group"
          aria-label={FORM.confirmDelete.prompt}
          className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:px-0 md:pt-1 md:pb-0"
        >
          <p className="text-body-md text-graphite">{FORM.confirmDelete.prompt}</p>
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className={secondaryButton}
            >
              {FORM.confirmDelete.cancel}
            </button>
            <button
              type="button"
              autoFocus
              disabled={remove.isPending}
              onClick={() => remove.mutate(guest.id, { onSuccess: () => onDeleted(guest) })}
              className={dangerButton}
            >
              {FORM.confirmDelete.confirm}
            </button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1 md:pb-0">
          <button type="button" onClick={onClose} className={secondaryButton}>
            {FORM.cancel}
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || (guest !== undefined && !isDirty)}
            aria-busy={mutation.isPending || undefined}
            className={primaryButton}
          >
            {mutation.isPending ? FORM.saving : FORM.save}
          </button>
        </div>
      )}
    </form>
  );
}

/**
 * How many people the invitation covers: − and + around a number field, so a
 * family of 4 is two taps on a phone and 250 can still be typed.
 */
function PartySizeField({
  value,
  onChange,
  onBlur,
  name,
  inputRef,
  error,
}: Readonly<{
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  name: string;
  inputRef: (element: HTMLInputElement | null) => void;
  error?: string;
}>) {
  const id = useId();
  const copy = FIELDS.maxGuests;
  const valid = Number.isInteger(value);
  const step = (by: number) =>
    onChange(
      Math.min(GUEST_MAX_GUESTS_MAX, Math.max(GUEST_MAX_GUESTS_MIN, (valid ? value : 1) + by)),
    );
  const stepButton = cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-sand bg-white text-graphite hover:bg-sand disabled:opacity-40",
    focusRing,
  );
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label-md text-graphite">
        {copy.label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={copy.decrease}
          disabled={valid && value <= GUEST_MAX_GUESTS_MIN}
          onClick={() => step(-1)}
          className={stepButton}
        >
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          id={id}
          ref={inputRef}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          value={Number.isNaN(value) ? "" : String(value)}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 5);
            onChange(digits ? Number(digits) : Number.NaN);
          }}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          className={cn(
            "h-12 w-20 rounded-xl border border-sand bg-white text-center text-[16px] font-semibold text-graphite tabular-nums outline-none",
            "focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10",
            "aria-invalid:border-destructive",
          )}
        />
        <button
          type="button"
          aria-label={copy.increase}
          disabled={valid && value >= GUEST_MAX_GUESTS_MAX}
          onClick={() => step(1)}
          className={stepButton}
        >
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
      <p id={`${id}-hint`} className={cn("text-body-sm", error ? "text-destructive" : "text-plum")}>
        {error ?? copy.hint}
      </p>
    </div>
  );
}

interface EventChoice {
  id: string;
  name: string;
  startsAt: string;
  archived?: boolean;
}

/** The events this invitation includes: one tick per event, with its date. */
function EventChecklist({
  choices,
  value,
  onChange,
  timeZone,
  error,
}: Readonly<{
  choices: readonly EventChoice[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  timeZone: string;
  error?: string;
}>) {
  const copy = FIELDS.events;
  const selected = new Set(value);
  const active = choices.filter((choice) => !choice.archived);
  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  const allActiveSelected = active.length > 0 && active.every((choice) => selected.has(choice.id));
  const textButton = cn(
    "tap-target rounded text-label-md text-burgundy underline-offset-4 hover:underline",
    focusRing,
  );

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      {/* The legend names the group for screen readers; the row below shows it with the button. */}
      <legend className="sr-only">{copy.label}</legend>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <span aria-hidden className="text-label-md text-graphite">
          {copy.label}
        </span>
        {active.length > 1 && (
          <button
            type="button"
            onClick={() =>
              onChange(
                allActiveSelected
                  ? value.filter((id) => !active.some((choice) => choice.id === id))
                  : [...new Set([...value, ...active.map((choice) => choice.id)])],
              )
            }
            className={textButton}
          >
            {allActiveSelected ? copy.none : copy.all}
          </button>
        )}
      </div>
      {choices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand bg-white p-4 text-body-sm text-plum">
          {copy.noEvents}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((choice) => {
            const tile = eventDateTile(choice.startsAt, timeZone);
            const checked = selected.has(choice.id);
            return (
              <li key={choice.id} className="min-w-0">
                <label className="block cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(choice.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border border-sand bg-white px-3 py-2 transition-colors hover:bg-ivory",
                      "peer-checked:border-burgundy peer-checked:bg-burgundy/5",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                        checked ? "border-burgundy bg-burgundy text-ivory" : "border-plum/40",
                      )}
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-label-md wrap-anywhere text-graphite",
                          choice.archived && "text-plum",
                        )}
                      >
                        {choice.name}
                      </span>
                      <span className="block text-body-sm text-plum">
                        {tile.day} {tile.month} {tile.year}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className={cn("text-body-sm", error ? "text-destructive" : "text-plum")}>
        {error ?? copy.hint}
      </p>
    </fieldset>
  );
}
