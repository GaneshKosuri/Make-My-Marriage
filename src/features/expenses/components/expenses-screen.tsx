"use client";

import {
  CheckCircle2,
  Pencil,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { DateRangeField } from "@/components/ui/date-time-fields";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SelectField } from "@/components/ui/select-field";
import { useEvents } from "@/features/events/api";
import { useVendors } from "@/features/vendors/api";
import { VENDORS_ROUTES } from "@/features/vendors/vendors-content";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/schedule";
import { formatINR } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/modules/expenses/expense.constants";
import type { ExpenseDto } from "@/modules/expenses/expense.types";

import { useExpenses, useExpenseSummary, type ExpensesQuery } from "../api";
import { EXPENSES, EXPENSES_ROUTES, expenseCategoryLabel } from "../expenses-content";
import { expensesUrlFor, readExpensesUrl, type ExpenseFilters } from "../url-state";
import { ExpenseFormDialog } from "./expense-form-dialog";

const PAGE_SIZE = 20;
/** Every vendor, archived included, for the vendor filter. */
const VENDOR_OPTIONS_LIMIT = 100;

/** What the form is showing: a new expense (maybe for a vendor) or an existing one. */
type Editing = { kind: "new"; vendorId?: string } | { kind: "edit"; expense: ExpenseDto } | null;

function useExpensesUrl() {
  const searchParams = useSearchParams();
  return {
    search: searchParams.toString(),
    ...readExpensesUrl(Object.fromEntries(searchParams)),
  };
}

/**
 * /app/expenses (PRD §9.15, API_DESIGN §53–58): the total, a breakdown by
 * category, and every expense with category, event, vendor and date filters
 * (kept in the address), pages of 20 and the add/edit sheet. Not a budget.
 */
export function ExpensesScreen({ today }: Readonly<{ today: string }>) {
  const url = useExpensesUrl();
  const [filters, setFilters] = useState<ExpenseFilters>(url.filters);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(
    url.startAdding ? { kind: "new", vendorId: url.filters.vendorId } : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const expenses = useExpenses({ page, limit: PAGE_SIZE, ...filters } satisfies ExpensesQuery);

  // Links into the screen while it stays mounted (the dashboard, the "+" sheet's
  // ?new=1, a vendor's page) arrive as a new address: follow it unless this screen wrote it.
  const [lastSearch, setLastSearch] = useState(url.search);
  if (url.search !== lastSearch) {
    setLastSearch(url.search);
    if (
      expensesUrlFor(EXPENSES_ROUTES.list, url.filters) !==
      expensesUrlFor(EXPENSES_ROUTES.list, filters)
    ) {
      setFilters(url.filters);
      setPage(1);
      setNotice(null);
    }
    if (url.startAdding) setEditing({ kind: "new", vendorId: url.filters.vendorId });
  }
  // Then drop ?new=1, so a reload or Back doesn't open the form again.
  const { startAdding } = url;
  const cleanUrl = expensesUrlFor(EXPENSES_ROUTES.list, url.filters);
  useEffect(() => {
    if (startAdding) window.history.replaceState(null, "", cleanUrl);
  }, [startAdding, cleanUrl]);

  // A page emptied by a delete moves back to the last page that still has expenses.
  const lastPage = expenses.data?.pagination.totalPages ?? 0;
  if (expenses.data && !expenses.isPlaceholderData && page > Math.max(lastPage, 1)) {
    setPage(Math.max(lastPage, 1));
  }

  const show = (next: ExpenseFilters) => {
    setFilters(next);
    setPage(1);
    setNotice(null);
    window.history.replaceState(null, "", expensesUrlFor(EXPENSES_ROUTES.list, next));
  };

  // After a refetch the form follows the latest copy of the expense it is editing.
  const editingExpense =
    editing?.kind === "edit"
      ? (expenses.data?.data.find((expense) => expense.id === editing.expense.id) ??
        editing.expense)
      : undefined;
  const filtered = Object.values(filters).some(Boolean);
  const add = () => {
    setNotice(null);
    setEditing({ kind: "new" });
  };

  let body;
  if (expenses.data) {
    body = (
      <ExpenseList
        expenses={expenses.data.data}
        pagination={expenses.data.pagination}
        filtered={filtered}
        onPage={setPage}
        onEdit={(expense) => {
          setNotice(null);
          setEditing({ kind: "edit", expense });
        }}
        onAdd={add}
        onClearFilters={() => show({})}
      />
    );
  } else if (expenses.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{EXPENSES.loadError.title}</p>
        <button type="button" onClick={() => void expenses.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", expenses.isFetching && "animate-spin")} />
          {EXPENSES.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <ListSkeleton rows={4} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{EXPENSES.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {EXPENSES.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{EXPENSES.description}</p>
        </div>
        <button type="button" onClick={add} className={primaryButton}>
          <Plus aria-hidden className="size-4" />
          {EXPENSES.add}
        </button>
      </header>

      <SummaryCard />

      <FilterBar filters={filters} onChange={show} />

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      {body}

      <ExpenseFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        expense={editingExpense}
        presetVendorId={editing?.kind === "new" ? editing.vendorId : undefined}
        today={today}
        onSaved={(expense) => {
          setNotice(
            editing?.kind === "edit"
              ? EXPENSES.form.updated(expense.title)
              : EXPENSES.form.added(expense.title),
          );
          setEditing(null);
        }}
        onDeleted={(expense) => {
          setNotice(EXPENSES.form.deleted(expense.title));
          setEditing(null);
        }}
      />
    </div>
  );
}

/**
 * The total and a bar per category, largest first, each bar against the
 * largest category. Shares of what was spent; never a budget or a limit.
 */
function SummaryCard() {
  const summary = useExpenseSummary();
  const all = useExpenses({ page: 1, limit: 1 });
  const copy = EXPENSES.summary;
  if (!summary.data || summary.data.totalExpensePaise === 0) return null;
  const largest = summary.data.byCategory[0]?.amountPaise ?? 1;
  const count = all.data?.pagination.total;
  return (
    <section
      aria-label={copy.label}
      className="grid grid-cols-1 gap-6 rounded-3xl border border-sand bg-white p-5 shadow-sm md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:p-7"
    >
      <div>
        <p className="text-body-sm text-plum">{copy.total}</p>
        <p className="mt-1 font-serif text-headline-lg wrap-anywhere text-graphite tabular-nums">
          {formatINR(summary.data.totalExpensePaise)}
        </p>
        {count !== undefined && <p className="mt-1 text-body-sm text-plum">{copy.count(count)}</p>}
      </div>
      <div>
        <h2 className="text-label-md text-graphite">{copy.byCategory}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {summary.data.byCategory.map((row) => (
            <li key={row.category}>
              <div className="flex items-baseline justify-between gap-3 text-body-sm">
                <span className="text-graphite">{expenseCategoryLabel(row.category)}</span>
                <span className="font-semibold text-graphite tabular-nums">
                  {formatINR(row.amountPaise)}
                </span>
              </div>
              <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
                <div
                  className="h-full rounded-full bg-burgundy"
                  style={{ width: `${Math.max(2, (row.amountPaise / largest) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FilterBar({
  filters,
  onChange,
}: Readonly<{ filters: ExpenseFilters; onChange: (filters: ExpenseFilters) => void }>) {
  const events = useEvents(true);
  const vendors = useVendors({ limit: VENDOR_OPTIONS_LIMIT, includeArchived: true });
  const copy = EXPENSES.filters;
  const filtersId = useId();
  const activeFilters = [filters.category, filters.eventId, filters.vendorId, filters.from].filter(
    Boolean,
  ).length;
  // Phones show a "Filters" button; the fields open below it.
  const [open, setOpen] = useState(activeFilters > 0);
  const set = (key: "category" | "eventId" | "vendorId", value: string) =>
    onChange({ ...filters, [key]: value || undefined });

  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-4 md:p-5">
      <legend className="sr-only">{copy.label}</legend>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={filtersId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-11 items-center gap-2 self-start rounded-full px-1 text-label-md text-burgundy md:hidden",
          focusRing,
        )}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {copy.toggle(activeFilters)}
      </button>
      <div
        id={filtersId}
        className={cn(
          "grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid md:grid-cols-3",
          open ? "grid" : "hidden",
        )}
      >
        <SelectField
          variant="filter"
          label={copy.category}
          value={filters.category ?? ""}
          onChange={(value) => set("category", value)}
          options={[
            { value: "", label: copy.anyCategory },
            ...EXPENSE_CATEGORIES.map((category) => ({
              value: category,
              label: expenseCategoryLabel(category),
            })),
          ]}
        />
        <SelectField
          variant="filter"
          label={copy.event}
          value={filters.eventId ?? ""}
          onChange={(value) => set("eventId", value)}
          options={[
            { value: "", label: copy.anyEvent },
            ...(events.data ?? []).map((event) => ({
              value: event.id,
              label: event.archivedAt ? EXPENSES.archived(event.name) : event.name,
            })),
          ]}
        />
        <SelectField
          variant="filter"
          label={copy.vendor}
          value={filters.vendorId ?? ""}
          onChange={(value) => set("vendorId", value)}
          options={[
            { value: "", label: copy.anyVendor },
            ...(vendors.data?.data ?? []).map((vendor) => ({
              value: vendor.id,
              label: vendor.archivedAt ? EXPENSES.archived(vendor.name) : vendor.name,
            })),
          ]}
        />
        {/* Two typed dates need more room than a dropdown: their own row. */}
        <div className="min-w-0 min-[360px]:col-span-2 md:col-span-3 md:max-w-md">
          <DateRangeField
            label={copy.dates}
            value={{ start: filters.from ?? "", end: filters.to ?? "" }}
            onChange={({ start, end }) =>
              onChange({ ...filters, from: start || undefined, to: end || undefined })
            }
            clearable
          />
        </div>
      </div>
      {activeFilters > 0 && (
        <button
          type="button"
          onClick={() => onChange({})}
          className={cn(
            "tap-target self-start rounded text-label-md text-burgundy underline-offset-4 hover:underline",
            focusRing,
          )}
        >
          {copy.clear}
        </button>
      )}
    </fieldset>
  );
}

function ExpenseList({
  expenses,
  pagination,
  filtered,
  onPage,
  onEdit,
  onAdd,
  onClearFilters,
}: Readonly<{
  expenses: readonly ExpenseDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filtered: boolean;
  onPage: (page: number) => void;
  onEdit: (expense: ExpenseDto) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}>) {
  if (pagination.total === 0) {
    const empty = filtered ? EXPENSES.noMatches : EXPENSES.empty;
    return (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <ReceiptIndianRupee aria-hidden className="mx-auto size-8 text-gold-deep" />
        <p className="mt-3 font-serif text-title-lg text-graphite">{empty.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{empty.description}</p>
        {filtered ? (
          <button type="button" onClick={onClearFilters} className={cn(secondaryButton, "mt-5")}>
            {EXPENSES.filters.clear}
          </button>
        ) : (
          <button type="button" onClick={onAdd} className={cn(primaryButton, "mt-5")}>
            {EXPENSES.empty.action}
          </button>
        )}
      </div>
    );
  }

  // A page past the end (its last expense just went): the screen is moving back a page.
  if (expenses.length === 0) return <ListSkeleton rows={4} />;

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = from + expenses.length - 1;
  return (
    <section
      aria-label={EXPENSES.title}
      className="rounded-3xl border border-sand bg-white px-5 pt-1 pb-5 shadow-sm md:px-7 md:pb-7"
    >
      <ul className="divide-y divide-sand">
        {expenses.map((expense) => (
          <li key={expense.id}>
            <ExpenseRow expense={expense} onEdit={onEdit} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="text-body-sm text-plum">{EXPENSES.count(from, to, pagination.total)}</p>
        {pagination.totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
              className={secondaryButton}
            >
              {EXPENSES.previous}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
              className={secondaryButton}
            >
              {EXPENSES.next}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** One expense: what it was for and the amount, then date, category, event and vendor. */
export function ExpenseRow({
  expense,
  onEdit,
}: Readonly<{ expense: ExpenseDto; onEdit?: (expense: ExpenseDto) => void }>) {
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-label-md wrap-break-word text-graphite">{expense.title}</p>
          <p className="shrink-0 font-semibold text-graphite tabular-nums">
            {formatINR(expense.amountPaise)}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-plum">
          <span>{formatShortDate(expense.expenseDate)}</span>
          <span className="rounded-full border border-sand bg-ivory px-2 py-0.5 text-label-sm">
            {expenseCategoryLabel(expense.category)}
          </span>
          {expense.event && (
            <span className={cn(expense.event.archivedAt && "line-through")}>
              {expense.event.archivedAt
                ? EXPENSES.archived(expense.event.name)
                : expense.event.name}
            </span>
          )}
          {expense.vendor && (
            <Link
              href={VENDORS_ROUTES.vendor(expense.vendor.id)}
              className={cn(
                "tap-target rounded text-burgundy underline-offset-4 hover:underline",
                focusRing,
              )}
            >
              {expense.vendor.archivedAt
                ? EXPENSES.archived(expense.vendor.name)
                : expense.vendor.name}
            </Link>
          )}
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(expense)}
          aria-label={EXPENSES.edit(expense.title)}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-plum hover:bg-sand hover:text-burgundy",
            focusRing,
          )}
        >
          <Pencil aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
