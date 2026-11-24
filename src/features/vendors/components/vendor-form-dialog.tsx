"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { EventChecklist, type EventChoice } from "@/components/ui/event-checklist";
import {
  FormAlert,
  MoneyField,
  OptionalTag,
  TextAreaField,
  TextField,
} from "@/components/ui/form-controls";
import { SaveProblem } from "@/components/ui/save-problem";
import { SelectField } from "@/components/ui/select-field";
import { useEvents } from "@/features/events/api";
import { ApiError } from "@/lib/api-client";
import { useReloadedCopy } from "@/lib/use-reloaded-copy";
import type { EventDto } from "@/modules/events/event.types";
import { VENDOR_CATEGORIES, type VendorCategory } from "@/modules/vendors/vendor.constants";
import type { DiscoveredPlaceDetailsDto, VendorDto } from "@/modules/vendors/vendor.types";

import {
  useAddVendorFromPlace,
  useCreateVendor,
  useDiscoveredPlace,
  useReloadVendor,
  useUpdateVendor,
} from "../api";
import {
  emptyVendorForm,
  placeToForm,
  toCreateVendorBody,
  toUpdateVendorBody,
  VENDOR_SERVER_FIELDS,
  vendorFormSchema,
  vendorToForm,
  type VendorFormValues,
} from "../vendor-form";
import { categoryLabel, DISCOVER, VENDORS, VENDORS_ROUTES } from "../vendors-content";

const FORM = VENDORS.form;
const FIELDS = FORM.fields;

export interface VendorFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The vendor being edited; adds a new one when absent. */
  vendor?: VendorDto;
  timeZone: string;
  onSaved: (vendor: VendorDto) => void;
  /**
   * Adds a vendor found on Google: the form opens pre-filled from the place's
   * details and the family reviews it before saving (decided 2026-11-18).
   */
  place?: { placeId: string; category: VendorCategory; restore?: boolean };
}

/**
 * Add or edit a vendor (PRD §9.16) in the dashboard sheet. Edits send only
 * what changed, with the version the form was loaded at.
 */
export function VendorFormDialog(props: Readonly<VendorFormDialogProps>) {
  const { open, onClose, vendor, place } = props;
  const events = useEvents();
  const details = useDiscoveredPlace(open && place && !vendor ? place.placeId : null);
  const fromGoogle = place !== undefined && vendor === undefined;
  const reloadVendor = useReloadVendor();
  const { current, formKey, setReloaded } = useReloadedCopy(vendor, open);

  let body;
  if (current?.archivedAt) {
    // Someone archived it meanwhile: "Reload" brought back an archived copy, which
    // can't be changed (QA V1). Say so instead of offering a save that always fails.
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md font-semibold text-graphite">{FORM.archived.title}</p>
        <p className="text-body-md text-plum">{FORM.archived.description}</p>
        <button type="button" onClick={onClose} className={secondaryButton}>
          {FORM.cancel}
        </button>
      </div>
    );
  } else if (fromGoogle && details.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-destructive">{DISCOVER.prefill.loadError}</p>
        <button type="button" onClick={() => void details.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {DISCOVER.prefill.retry}
        </button>
      </div>
    );
  } else if (events.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-destructive">{FORM.optionsError}</p>
        <button type="button" onClick={() => void events.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {FORM.optionsRetry}
        </button>
      </div>
    );
  } else if (events.data && (!fromGoogle || details.data)) {
    body = (
      // Keyed by id only: a newer copy arriving in the background must not wipe
      // what is being typed. Saving then answers CONFLICT, and "Reload vendor"
      // starts a fresh form from the latest copy.
      <VendorForm
        key={formKey}
        {...props}
        vendor={current}
        prefill={
          fromGoogle && place
            ? { details: details.data!, category: place.category, restore: place.restore ?? false }
            : undefined
        }
        events={events.data}
        onReload={async () => {
          if (!current) return;
          const fresh = await reloadVendor(current.id);
          setReloaded(fresh);
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
    <Dialog open={open} onClose={onClose} title={vendor ? FORM.editTitle : FORM.addTitle}>
      {body}
    </Dialog>
  );
}

function VendorForm({
  onClose,
  vendor: vendorProp,
  timeZone,
  onSaved,
  events,
  onReload,
  prefill,
}: Readonly<
  VendorFormDialogProps & {
    events: readonly EventDto[];
    onReload: () => Promise<void>;
    prefill?: { details: DiscoveredPlaceDetailsDto; category: VendorCategory; restore: boolean };
  }
>) {
  const router = useRouter();
  // The copy this form was opened with: its values and version are what an edit
  // is based on, even if a newer copy arrives meanwhile.
  const [vendor] = useState(vendorProp);
  const [initial] = useState(() => {
    if (vendor) return vendorToForm(vendor);
    return prefill ? placeToForm(prefill.details, prefill.category) : emptyVendorForm();
  });
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const addFromPlace = useAddVendorFromPlace();
  let mutation: typeof create | typeof update | typeof addFromPlace = create;
  if (vendor) mutation = update;
  else if (prefill) mutation = addFromPlace;
  // The place itself was refused (Google no longer lists it): not a field of the form.
  const placeProblem =
    mutation.error instanceof ApiError ? mutation.error.details?.googlePlaceId : undefined;
  const [reloadFailed, setReloadFailed] = useState(false);

  const form = useForm({ resolver: zodResolver(vendorFormSchema), defaultValues: initial });
  const { errors, isDirty } = form.formState;

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) return;
    for (const [apiField, formField] of Object.entries(VENDOR_SERVER_FIELDS)) {
      const message = error.details[apiField];
      if (message) form.setError(formField, { type: "server", message }, { shouldFocus: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (vendor) {
      const body = toUpdateVendorBody(values, initial, vendor.version);
      if (!body) return onClose();
      update.mutate({ vendorId: vendor.id, body }, { onSuccess: onSaved, onError });
    } else if (prefill) {
      addFromPlace.mutate(
        { ...toCreateVendorBody(values), googlePlaceId: prefill.details.googlePlaceId },
        { onSuccess: onSaved, onError },
      );
    } else {
      create.mutate(toCreateVendorBody(values), { onSuccess: onSaved, onError });
    }
  });

  // Archived events stay listed (and can be unticked) on the vendor that has them.
  const archivedLinked = (vendor?.events ?? []).filter((event) => event.archivedAt);
  const choices: EventChoice[] = [
    ...events.map((event) => ({ id: event.id, name: event.name, startsAt: event.startsAt })),
    ...archivedLinked.map((event) => ({
      id: event.id,
      name: VENDORS.archivedEvent(event.name),
      startsAt: event.startsAt,
      archived: true,
    })),
  ];

  const text = (name: Exclude<keyof VendorFormValues, "eventIds" | "category">) =>
    form.register(name);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {prefill && (
        <p className="flex gap-2 rounded-xl bg-sand/60 p-3 text-body-sm text-graphite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-deep" />
          {prefill.restore ? DISCOVER.prefill.restoreNote : DISCOVER.prefill.note}
        </p>
      )}
      {placeProblem && <FormAlert title={DISCOVER.prefill.error.title}>{placeProblem}</FormAlert>}
      <SaveProblem
        error={reloadFailed ? new ApiError(404, "NOT_FOUND", "") : mutation.error}
        onReload={() => {
          // From Google, CONFLICT means the place is already saved: show My Vendors.
          if (prefill) return router.push(VENDORS_ROUTES.list);
          void onReload().catch(() => setReloadFailed(true));
        }}
        copy={prefill ? DISCOVER.prefill : FORM}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={FIELDS.name.label}
          autoComplete="off"
          placeholder={FIELDS.name.placeholder}
          error={errors.name?.message}
          {...text("name")}
        />
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <SelectField
              label={FIELDS.category.label}
              placeholder={FIELDS.category.placeholder}
              error={errors.category?.message}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              options={VENDOR_CATEGORIES.map((category) => ({
                value: category,
                label: categoryLabel(category),
              }))}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={FIELDS.contactPerson.label}
          labelAside={<OptionalTag />}
          autoComplete="off"
          placeholder={FIELDS.contactPerson.placeholder}
          error={errors.contactPerson?.message}
          {...text("contactPerson")}
        />
        <TextField
          label={FIELDS.phone.label}
          labelAside={<OptionalTag />}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder={FIELDS.phone.placeholder}
          error={errors.phone?.message}
          {...text("phone")}
        />
        <TextField
          label={FIELDS.email.label}
          labelAside={<OptionalTag />}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder={FIELDS.email.placeholder}
          error={errors.email?.message}
          {...text("email")}
        />
        <TextField
          label={FIELDS.website.label}
          labelAside={<OptionalTag />}
          inputMode="url"
          autoComplete="off"
          placeholder={FIELDS.website.placeholder}
          error={errors.website?.message}
          {...text("website")}
        />
      </div>

      <TextAreaField
        label={FIELDS.address.label}
        labelAside={<OptionalTag />}
        rows={2}
        placeholder={FIELDS.address.placeholder}
        error={errors.address?.message}
        {...text("address")}
      />

      <MoneyField
        label={FIELDS.agreedCost.label}
        labelAside={<OptionalTag />}
        placeholder={FIELDS.agreedCost.placeholder}
        hint={<p className="text-body-sm text-plum">{FIELDS.agreedCost.hint}</p>}
        error={errors.agreedCost?.message}
        {...text("agreedCost")}
      />

      <Controller
        control={form.control}
        name="eventIds"
        render={({ field }) => (
          <EventChecklist
            copy={FIELDS.events}
            choices={choices}
            value={field.value}
            onChange={field.onChange}
            timeZone={timeZone}
            error={errors.eventIds?.message}
          />
        )}
      />

      <TextAreaField
        label={FIELDS.notes.label}
        labelAside={<OptionalTag />}
        rows={3}
        placeholder={FIELDS.notes.placeholder}
        error={errors.notes?.message}
        {...text("notes")}
      />

      <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1 md:pb-0">
        <button type="button" onClick={onClose} className={secondaryButton}>
          {FORM.cancel}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || (vendor !== undefined && !isDirty)}
          aria-busy={mutation.isPending || undefined}
          className={primaryButton}
        >
          {mutation.isPending ? FORM.saving : FORM.save}
        </button>
      </div>
    </form>
  );
}
