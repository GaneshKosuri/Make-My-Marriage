"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  dangerButton,
  focusRing,
  primaryButton,
  secondaryButton,
} from "@/components/ui/button-styles";
import { DateField } from "@/components/ui/date-time-fields";
import { Dialog } from "@/components/ui/dialog";
import { MoneyField, OptionalTag, TextAreaField, TextField } from "@/components/ui/form-controls";
import { SaveProblem } from "@/components/ui/save-problem";
import { SelectField } from "@/components/ui/select-field";
import { useEvents } from "@/features/events/api";
import { useVendors } from "@/features/vendors/api";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/expense.constants";
import type { ExpenseDto } from "@/modules/expenses/expense.types";
import type { EventDto } from "@/modules/events/event.types";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { useCreateExpense, useDeleteExpense, useReloadExpense, useUpdateExpense } from "../api";
import {
  emptyExpenseForm,
  EXPENSE_CATEGORY_FOR_VENDOR,
  EXPENSE_SERVER_FIELDS,
  expenseFormSchema,
  expenseToForm,
  toCreateExpenseBody,
  toUpdateExpenseBody,
} from "../expense-form";
import { EXPENSES, expenseCategoryLabel } from "../expenses-content";

const FORM = EXPENSES.form;
const FIELDS = FORM.fields;
/** Every active vendor, for the vendor dropdown (a wedding books a few dozen at most). */
const VENDOR_OPTIONS_LIMIT = 100;

export interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** The expense being edited; adds a new one when absent. */
  expense?: ExpenseDto;
  /** For a new expense: this vendor already chosen (from the vendor's page). */
  presetVendorId?: string;
  /** Today in the wedding's time zone ("YYYY-MM-DD"): a new expense's date. */
  today: string;
  onSaved: (expense: ExpenseDto) => void;
  onDeleted?: (expense: ExpenseDto) => void;
}

/**
 * Add or edit an expense (PRD §9.15) in the dashboard sheet. Edits send only
 * what changed, with the version the form was loaded at. Deleting asks first.
 */
export function ExpenseFormDialog(props: Readonly<ExpenseFormDialogProps>) {
  const { open, onClose, expense } = props;
  const events = useEvents();
  const vendors = useVendors({ limit: VENDOR_OPTIONS_LIMIT });
  const reloadExpense = useReloadExpense();
  // A copy fetched by "Reload expense" after a CONFLICT; `count` starts a fresh form.
  const [reloaded, setReloaded] = useState<{ expense: ExpenseDto; count: number } | null>(null);
  const current =
    reloaded && expense && reloaded.expense.id === expense.id ? reloaded.expense : expense;

  let body;
  if (events.isError || vendors.isError) {
    body = (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-body-md text-destructive">{FORM.optionsError}</p>
        <button
          type="button"
          onClick={() => {
            if (events.isError) void events.refetch();
            if (vendors.isError) void vendors.refetch();
          }}
          className={secondaryButton}
        >
          <RefreshCw aria-hidden className="size-4" />
          {FORM.optionsRetry}
        </button>
      </div>
    );
  } else if (events.data && vendors.data) {
    body = (
      // Keyed by id only: a newer copy arriving in the background must not wipe
      // what is being typed. Saving then answers CONFLICT, and "Reload expense"
      // starts a fresh form from the latest copy.
      <ExpenseForm
        key={current ? `${current.id}:${reloaded?.count ?? 0}` : "new"}
        {...props}
        expense={current}
        events={events.data}
        vendors={vendors.data.data}
        onReload={async () => {
          if (!current) return;
          const fresh = await reloadExpense(current.id);
          setReloaded((last) => ({ expense: fresh, count: (last?.count ?? 0) + 1 }));
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
    <Dialog open={open} onClose={onClose} title={expense ? FORM.editTitle : FORM.addTitle}>
      {body}
    </Dialog>
  );
}

function ExpenseForm({
  onClose,
  expense: expenseProp,
  presetVendorId,
  today,
  onSaved,
  onDeleted,
  events,
  vendors,
  onReload,
}: Readonly<
  ExpenseFormDialogProps & {
    events: readonly EventDto[];
    vendors: readonly VendorDto[];
    onReload: () => Promise<void>;
  }
>) {
  // The copy this form was opened with: its values and version are what an edit
  // is based on, even if a newer copy arrives meanwhile.
  const [expense] = useState(expenseProp);
  const [initial] = useState(() => {
    if (expense) return expenseToForm(expense);
    const preset = vendors.find((vendor) => vendor.id === presetVendorId);
    return emptyExpenseForm(today, preset);
  });
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();
  const mutation = expense ? update : create;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reloadFailed, setReloadFailed] = useState(false);
  const [categoryFromVendor, setCategoryFromVendor] = useState(false);

  const form = useForm({ resolver: zodResolver(expenseFormSchema), defaultValues: initial });
  const { errors, isDirty } = form.formState;

  const onError = (error: unknown) => {
    if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR" || !error.details) return;
    for (const [apiField, formField] of Object.entries(EXPENSE_SERVER_FIELDS)) {
      const message = error.details[apiField];
      if (message) form.setError(formField, { type: "server", message }, { shouldFocus: true });
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (expense) {
      const body = toUpdateExpenseBody(values, initial, expense.version);
      if (!body) return onClose();
      update.mutate({ expenseId: expense.id, body }, { onSuccess: onSaved, onError });
    } else {
      create.mutate(toCreateExpenseBody(values), { onSuccess: onSaved, onError });
    }
  });

  // An archived event or vendor the expense already has stays offered, so saving keeps it.
  const eventOptions = [
    { value: "", label: FIELDS.event.none },
    ...events.map((event) => ({ value: event.id, label: event.name })),
    ...(expense?.event?.archivedAt
      ? [{ value: expense.event.id, label: EXPENSES.archived(expense.event.name) }]
      : []),
  ];
  const vendorOptions = [
    { value: "", label: FIELDS.vendor.none },
    ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    ...(expense?.vendor && !vendors.some((vendor) => vendor.id === expense.vendor!.id)
      ? [{ value: expense.vendor.id, label: EXPENSES.archived(expense.vendor.name) }]
      : []),
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      <SaveProblem
        error={reloadFailed ? new ApiError(404, "NOT_FOUND", "") : (mutation.error ?? remove.error)}
        onReload={() => void onReload().catch(() => setReloadFailed(true))}
        copy={FORM}
      />

      <TextField
        label={FIELDS.title.label}
        autoComplete="off"
        placeholder={FIELDS.title.placeholder}
        error={errors.title?.message}
        {...form.register("title")}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MoneyField
          label={FIELDS.amount.label}
          placeholder={FIELDS.amount.placeholder}
          error={errors.amount?.message}
          {...form.register("amount")}
        />
        <Controller
          control={form.control}
          name="expenseDate"
          render={({ field }) => (
            <DateField
              label={FIELDS.date.label}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              today={today}
              error={errors.expenseDate?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="vendorId"
          render={({ field }) => (
            <SelectField
              label={FIELDS.vendor.label}
              labelAside={<OptionalTag />}
              error={errors.vendorId?.message}
              value={field.value}
              onChange={(vendorId) => {
                field.onChange(vendorId);
                // Fill the category from the vendor only while none is chosen.
                const vendor = vendors.find((item) => item.id === vendorId);
                if (vendor && !form.getValues("category")) {
                  form.setValue("category", EXPENSE_CATEGORY_FOR_VENDOR[vendor.category], {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setCategoryFromVendor(true);
                }
              }}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              options={vendorOptions}
            />
          )}
        />
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <SelectField
              label={FIELDS.category.label}
              placeholder={FIELDS.category.placeholder}
              error={errors.category?.message}
              hint={
                categoryFromVendor ? (
                  <p className="text-body-sm text-plum">{FIELDS.vendor.categoryFromVendor}</p>
                ) : undefined
              }
              value={field.value}
              onChange={(category) => {
                field.onChange(category);
                setCategoryFromVendor(false);
              }}
              onBlur={field.onBlur}
              name={field.name}
              fieldRef={field.ref}
              options={EXPENSE_CATEGORIES.map((category) => ({
                value: category,
                label: expenseCategoryLabel(category),
              }))}
            />
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="eventId"
        render={({ field }) => (
          <SelectField
            label={FIELDS.event.label}
            labelAside={<OptionalTag />}
            error={errors.eventId?.message}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            name={field.name}
            fieldRef={field.ref}
            options={eventOptions}
          />
        )}
      />

      <TextAreaField
        label={FIELDS.notes.label}
        labelAside={<OptionalTag />}
        rows={2}
        placeholder={FIELDS.notes.placeholder}
        error={errors.notes?.message}
        {...form.register("notes")}
      />

      {expense && onDeleted && !confirmingDelete && (
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
      {expense && onDeleted && confirmingDelete ? (
        <div
          role="group"
          aria-label={FORM.confirmDelete.confirm}
          className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:border-0 md:px-0 md:pt-1 md:pb-0"
        >
          <p className="text-body-md text-graphite">
            {FORM.confirmDelete.prompt(expense.title, formatINR(expense.amountPaise))}
          </p>
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
              onClick={() => remove.mutate(expense.id, { onSuccess: () => onDeleted(expense) })}
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
            disabled={mutation.isPending || (expense !== undefined && !isDirty)}
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
