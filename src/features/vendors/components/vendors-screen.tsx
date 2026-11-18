"use client";

import { CheckCircle2, Compass, Plus, RefreshCw, Search, Store, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/cn";
import { VENDOR_CATEGORIES } from "@/modules/vendors/vendor.constants";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { useVendors, type VendorsQuery } from "../api";
import { readVendorsUrl, vendorsUrlFor, type VendorFilters } from "../url-state";
import { categoryLabel, VENDORS, VENDORS_ROUTES } from "../vendors-content";
import { VendorFormDialog } from "./vendor-form-dialog";
import { VendorRow } from "./vendor-row";

const PAGE_SIZE = 20;
/** Wait this long after the last keystroke before searching. */
const SEARCH_DELAY_MS = 300;

function toQuery(filters: VendorFilters, page: number): VendorsQuery {
  const { archived, ...rest } = filters;
  return { page, limit: PAGE_SIZE, ...rest, ...(archived && { includeArchived: true }) };
}

/** What the form is showing: a new vendor or an existing one. */
type Editing = { kind: "new" } | { kind: "edit"; vendor: VendorDto } | null;

function useVendorsUrl() {
  const searchParams = useSearchParams();
  return {
    search: searchParams.toString(),
    ...readVendorsUrl(Object.fromEntries(searchParams)),
  };
}

/**
 * /app/vendors (PRD §9.16, API_DESIGN §59–64): the vendors booked for the
 * wedding, with search, category and archived filters (kept in the address),
 * pages of 20 and the add/edit sheet.
 */
export function VendorsScreen({ timeZone }: Readonly<{ timeZone: string }>) {
  const url = useVendorsUrl();
  const [filters, setFilters] = useState<VendorFilters>(url.filters);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing>(url.startAdding ? { kind: "new" } : null);
  const [notice, setNotice] = useState<string | null>(null);
  const vendors = useVendors(toQuery(filters, page));

  // Links into the screen while it stays mounted (the dashboard, the "+" sheet's
  // ?new=1) arrive as a new address: follow it unless this screen wrote it.
  const [lastSearch, setLastSearch] = useState(url.search);
  if (url.search !== lastSearch) {
    setLastSearch(url.search);
    if (
      vendorsUrlFor(VENDORS_ROUTES.list, url.filters) !==
      vendorsUrlFor(VENDORS_ROUTES.list, filters)
    ) {
      setFilters(url.filters);
      setPage(1);
      setNotice(null);
    }
    if (url.startAdding) setEditing({ kind: "new" });
  }
  // Then drop ?new=1, so a reload or Back doesn't open the form again.
  const { startAdding } = url;
  const cleanUrl = vendorsUrlFor(VENDORS_ROUTES.list, url.filters);
  useEffect(() => {
    if (startAdding) window.history.replaceState(null, "", cleanUrl);
  }, [startAdding, cleanUrl]);

  // A page emptied (e.g. by archiving its last vendor) moves back to the last page.
  const lastPage = vendors.data?.pagination.totalPages ?? 0;
  if (vendors.data && !vendors.isPlaceholderData && page > Math.max(lastPage, 1)) {
    setPage(Math.max(lastPage, 1));
  }

  const show = (next: VendorFilters) => {
    setFilters(next);
    setPage(1);
    setNotice(null);
    window.history.replaceState(null, "", vendorsUrlFor(VENDORS_ROUTES.list, next));
  };

  // After a refetch the form follows the latest copy of the vendor it is editing.
  const editingVendor =
    editing?.kind === "edit"
      ? (vendors.data?.data.find((vendor) => vendor.id === editing.vendor.id) ?? editing.vendor)
      : undefined;
  const filtered = Boolean(filters.search || filters.category);
  const add = () => {
    setNotice(null);
    setEditing({ kind: "new" });
  };

  let body;
  if (vendors.data) {
    body = (
      <VendorList
        vendors={vendors.data.data}
        pagination={vendors.data.pagination}
        filtered={filtered}
        onPage={setPage}
        onEdit={(vendor) => {
          setNotice(null);
          setEditing({ kind: "edit", vendor });
        }}
        onAdd={add}
        onClearFilters={() => show({ ...(filters.archived && { archived: "1" }) })}
      />
    );
  } else if (vendors.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{VENDORS.loadError.title}</p>
        <button type="button" onClick={() => void vendors.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", vendors.isFetching && "animate-spin")} />
          {VENDORS.loadError.retry}
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
          <p className="text-eyebrow text-gold-deep uppercase">{VENDORS.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {VENDORS.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{VENDORS.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={VENDORS_ROUTES.discover} className={secondaryButton}>
            <Compass aria-hidden className="size-4" />
            {VENDORS.discover}
          </Link>
          <button type="button" onClick={add} className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            {VENDORS.add}
          </button>
        </div>
      </header>

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

      <VendorFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        vendor={editingVendor}
        timeZone={timeZone}
        onSaved={(vendor) => {
          setNotice(
            editing?.kind === "edit"
              ? VENDORS.form.updated(vendor.name)
              : VENDORS.form.added(vendor.name),
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

function FilterBar({
  filters,
  onChange,
}: Readonly<{ filters: VendorFilters; onChange: (filters: VendorFilters) => void }>) {
  const copy = VENDORS.filters;
  const searchId = useId();

  // The box shows what is typed at once; the list follows a moment later.
  const [typed, setTyped] = useState(filters.search ?? "");
  const [lastSearch, setLastSearch] = useState(filters.search);
  if (filters.search !== lastSearch) {
    setLastSearch(filters.search);
    if ((filters.search ?? "") !== typed.trim()) setTyped(filters.search ?? "");
  }
  useEffect(() => {
    const next = typed.trim() || undefined;
    if (next === filters.search) return;
    const timer = window.setTimeout(() => onChange({ ...filters, search: next }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [typed, filters, onChange]);

  return (
    <fieldset className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-4 md:p-5">
      <legend className="sr-only">{copy.label}</legend>
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_16rem]">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            {VENDORS.search.label}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-plum"
          />
          <input
            id={searchId}
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={VENDORS.search.placeholder}
            autoComplete="off"
            className={cn(
              "h-11 w-full rounded-xl border border-sand bg-ivory pr-11 pl-10 text-[16px] text-graphite placeholder:text-plum/70 sm:text-body-md",
              "focus-visible:border-burgundy focus-visible:ring-[3px] focus-visible:ring-burgundy/10 focus-visible:outline-none",
              "[&::-webkit-search-cancel-button]:hidden",
            )}
          />
          {typed && (
            <button
              type="button"
              onClick={() => setTyped("")}
              aria-label={`Clear ${VENDORS.search.label.toLowerCase()}`}
              className={cn(
                "absolute top-1/2 right-0.5 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-plum hover:text-burgundy",
                focusRing,
              )}
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
        <SelectField
          variant="filter"
          label={copy.category}
          value={filters.category ?? ""}
          onChange={(value) =>
            onChange({ ...filters, category: (value || undefined) as VendorFilters["category"] })
          }
          options={[
            { value: "", label: copy.anyCategory },
            ...VENDOR_CATEGORIES.map((category) => ({
              value: category,
              label: categoryLabel(category),
            })),
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ArchivedToggle
          checked={filters.archived === "1"}
          onChange={(checked) => onChange({ ...filters, archived: checked ? "1" : undefined })}
        />
        {(filters.search || filters.category) && (
          <button
            type="button"
            onClick={() => {
              setTyped("");
              onChange({ ...(filters.archived && { archived: "1" }) });
            }}
            className={cn(
              "tap-target rounded text-label-md text-burgundy underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            {copy.clear}
          </button>
        )}
      </div>
    </fieldset>
  );
}

/** "Show archived": a switch with a 44 px tap area. */
function ArchivedToggle({
  checked,
  onChange,
}: Readonly<{ checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("inline-flex min-h-11 items-center gap-3 rounded-full pr-2", focusRing)}
    >
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-burgundy" : "bg-sand",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
      <span className="text-label-md text-graphite">{VENDORS.filters.showArchived}</span>
    </button>
  );
}

function VendorList({
  vendors,
  pagination,
  filtered,
  onPage,
  onEdit,
  onAdd,
  onClearFilters,
}: Readonly<{
  vendors: readonly VendorDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filtered: boolean;
  onPage: (page: number) => void;
  onEdit: (vendor: VendorDto) => void;
  onAdd: () => void;
  onClearFilters: () => void;
}>) {
  if (pagination.total === 0) {
    const empty = filtered ? VENDORS.noMatches : VENDORS.empty;
    return (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <Store aria-hidden className="mx-auto size-8 text-gold-deep" />
        <p className="mt-3 font-serif text-title-lg text-graphite">{empty.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">{empty.description}</p>
        {filtered ? (
          <button type="button" onClick={onClearFilters} className={cn(secondaryButton, "mt-5")}>
            {VENDORS.filters.clear}
          </button>
        ) : (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onAdd} className={primaryButton}>
              {VENDORS.empty.action}
            </button>
            <Link href={VENDORS_ROUTES.discover} className={secondaryButton}>
              {VENDORS.discover}
            </Link>
          </div>
        )}
      </div>
    );
  }

  // A page past the end (its last vendor just went): the screen is moving back a page.
  if (vendors.length === 0) return <ListSkeleton rows={4} />;

  const from = (pagination.page - 1) * pagination.limit + 1;
  const to = from + vendors.length - 1;
  return (
    <section
      aria-label={VENDORS.title}
      className="rounded-3xl border border-sand bg-white px-5 pt-1 pb-5 shadow-sm md:px-7 md:pb-7"
    >
      <ul className="divide-y divide-sand">
        {vendors.map((vendor) => (
          <li key={vendor.id}>
            <VendorRow vendor={vendor} onEdit={onEdit} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-sand pt-4">
        <p className="text-body-sm text-plum">{VENDORS.count(from, to, pagination.total)}</p>
        {pagination.totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
              className={secondaryButton}
            >
              {VENDORS.previous}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
              className={secondaryButton}
            >
              {VENDORS.next}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
