"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MapPin,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { primaryButton, secondaryButton, textLink } from "@/components/ui/button-styles";
import { OptionalTag, TextField } from "@/components/ui/form-controls";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { mapsSearchUrl } from "@/lib/schedule";
import {
  VENDOR_CATEGORIES,
  VENDOR_DISCOVERY_NEAR_MAX_LENGTH,
  VENDOR_DISCOVERY_QUERY_MAX_LENGTH,
  type VendorCategory,
} from "@/modules/vendors/vendor.constants";
import type { DiscoveredVendorDto } from "@/modules/vendors/vendor.types";

import { useVendorDiscovery } from "../api";
import { discoverUrlFor, readDiscoverUrl, type DiscoverSearch } from "../url-state";
import { categoryLabel, DISCOVER, VENDORS_ROUTES } from "../vendors-content";
import { VendorFormDialog } from "./vendor-form-dialog";

const FORM = DISCOVER.form;

const ratingFormat = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * /app/vendors/discover (PRD §9.17, API_DESIGN §61, §65–66): search Google for
 * a category near a town (the wedding's city by default), then add a result
 * through the vendor form pre-filled from Google. The search lives in the
 * address, so Back from a vendor shows the same results without searching again.
 */
export function DiscoverScreen({
  defaultNear,
  timeZone,
}: Readonly<{ defaultNear: string | null; timeZone: string }>) {
  const searchParams = useSearchParams();
  const fromUrl = readDiscoverUrl(Object.fromEntries(searchParams));
  const [submitted, setSubmitted] = useState<DiscoverSearch | null>(fromUrl);
  const [adding, setAdding] = useState<{
    placeId: string;
    category: VendorCategory;
    restore: boolean;
  } | null>(null);
  const [notice, setNotice] = useState<{
    name: string;
    vendorId: string;
    restored: boolean;
  } | null>(null);
  const results = useVendorDiscovery(submitted);

  const search = (next: DiscoverSearch) => {
    setSubmitted(next);
    setNotice(null);
    window.history.replaceState(null, "", discoverUrlFor(VENDORS_ROUTES.discover, next));
    // The same search again after a failure asks Google once more; a
    // successful one is shown from the cache.
    const same = submitted && discoverUrlFor("", submitted) === discoverUrlFor("", next);
    if (same && results.isError) void results.refetch();
  };

  const serverNearError =
    results.error instanceof ApiError ? results.error.details?.near : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <header>
        <Link href={VENDORS_ROUTES.list} className={textLink}>
          <ArrowLeft aria-hidden className="size-4" />
          {DISCOVER.back}
        </Link>
        <p className="mt-3 text-eyebrow text-gold-deep uppercase">{DISCOVER.eyebrow}</p>
        <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
          {DISCOVER.title}
        </h1>
        <p className="mt-1 text-body-md text-plum">{DISCOVER.description}</p>
      </header>

      <SearchForm
        initial={fromUrl}
        defaultNear={defaultNear}
        pending={results.isFetching}
        serverNearError={serverNearError}
        onSearch={search}
      />

      {notice && (
        <p
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          <span className="min-w-0 flex-1 wrap-break-word">
            {notice.restored ? DISCOVER.restored(notice.name) : DISCOVER.added(notice.name)}
          </span>
          <Link href={VENDORS_ROUTES.vendor(notice.vendorId)} className={textLink}>
            {DISCOVER.view}
          </Link>
        </p>
      )}

      <Results
        submitted={submitted}
        results={results}
        serverNearError={serverNearError}
        onAdd={(place) => {
          setNotice(null);
          if (submitted) {
            setAdding({
              placeId: place.googlePlaceId,
              category: submitted.category,
              restore: place.myVendor?.archived === true,
            });
          }
        }}
      />

      <VendorFormDialog
        open={adding !== null}
        onClose={() => setAdding(null)}
        place={adding ?? undefined}
        timeZone={timeZone}
        onSaved={(vendor) => {
          setNotice({ name: vendor.name, vendorId: vendor.id, restored: adding?.restore ?? false });
          setAdding(null);
        }}
      />
    </div>
  );
}

function SearchForm({
  initial,
  defaultNear,
  pending,
  serverNearError,
  onSearch,
}: Readonly<{
  initial: DiscoverSearch | null;
  defaultNear: string | null;
  pending: boolean;
  serverNearError: string | undefined;
  onSearch: (search: DiscoverSearch) => void;
}>) {
  const [category, setCategory] = useState<VendorCategory | null>(initial?.category ?? null);
  const [near, setNear] = useState(initial?.near ?? defaultNear ?? "");
  const [query, setQuery] = useState(initial?.query ?? "");
  const [errors, setErrors] = useState<{ category?: string; near?: string }>({});
  const legendId = useId();
  const categoryErrorId = useId();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      category: category ? undefined : FORM.categoryRequired,
      near: near.trim() ? undefined : FORM.nearRequired,
    };
    setErrors(next);
    if (!category || next.near) {
      const form = event.currentTarget;
      const invalid = form.querySelector<HTMLInputElement>(
        next.category ? "input[name='category']" : "input[name='near']",
      );
      invalid?.focus();
      return;
    }
    onSearch({ category, near: near.trim(), ...(query.trim() && { query: query.trim() }) });
  };

  return (
    <form
      noValidate
      role="search"
      aria-label={DISCOVER.title}
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-3xl border border-sand bg-white p-4 md:p-6"
    >
      <fieldset aria-describedby={errors.category ? categoryErrorId : undefined}>
        <legend id={legendId} className="mb-2 text-label-md text-graphite">
          {FORM.category}
        </legend>
        <div className="flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="category"
                value={value}
                checked={category === value}
                onChange={() => {
                  setCategory(value);
                  setErrors((last) => ({ ...last, category: undefined }));
                }}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex h-9 items-center rounded-full border border-sand bg-white px-3.5 text-label-md text-graphite hover:bg-sand",
                  "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                )}
              >
                {categoryLabel(value)}
              </span>
            </label>
          ))}
        </div>
        {errors.category && (
          <p id={categoryErrorId} className="mt-2 text-body-sm text-destructive">
            {errors.category}
          </p>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          label={FORM.near.label}
          name="near"
          icon={<MapPin className="size-5" />}
          autoComplete="off"
          maxLength={VENDOR_DISCOVERY_NEAR_MAX_LENGTH}
          placeholder={FORM.near.placeholder}
          value={near}
          onChange={(event) => {
            setNear(event.target.value);
            setErrors((last) => ({ ...last, near: undefined }));
          }}
          error={errors.near ?? serverNearError}
        />
        <TextField
          label={FORM.query.label}
          labelAside={<OptionalTag />}
          name="query"
          autoComplete="off"
          maxLength={VENDOR_DISCOVERY_QUERY_MAX_LENGTH}
          placeholder={FORM.query.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
          className={cn(primaryButton, "w-full sm:w-auto")}
        >
          <Search aria-hidden className="size-4" />
          {pending ? FORM.searching : FORM.search}
        </button>
      </div>
    </form>
  );
}

function Results({
  submitted,
  results,
  serverNearError,
  onAdd,
}: Readonly<{
  submitted: DiscoverSearch | null;
  results: ReturnType<typeof useVendorDiscovery>;
  serverNearError: string | undefined;
  onAdd: (place: DiscoveredVendorDto) => void;
}>) {
  if (!submitted) {
    return <EmptyState title={DISCOVER.intro.title} description={DISCOVER.intro.description} />;
  }
  if (results.data) {
    const places = results.data;
    if (places.length === 0) {
      return <EmptyState title={DISCOVER.empty.title} description={DISCOVER.empty.description} />;
    }
    return (
      <section aria-labelledby="discover-results" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="discover-results" className="text-label-md text-graphite">
            {DISCOVER.results(places.length, categoryLabel(submitted.category), submitted.near)}
          </h2>
          <p className="text-body-sm text-plum">{DISCOVER.attribution}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <PlaceCard key={place.googlePlaceId} place={place} onAdd={() => onAdd(place)} />
          ))}
        </ul>
      </section>
    );
  }
  if (results.isError) {
    // A bad place shows next to the field instead.
    if (serverNearError) return null;
    const limited = results.error instanceof ApiError && results.error.code === "RATE_LIMITED";
    const copy = limited ? DISCOVER.rateLimited : DISCOVER.unavailable;
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <div>
          <p className="text-body-md font-semibold text-graphite">{copy.title}</p>
          <p className="mt-0.5 text-body-sm text-plum">{copy.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!limited && (
            <button
              type="button"
              onClick={() => void results.refetch()}
              className={secondaryButton}
            >
              <RefreshCw
                aria-hidden
                className={cn("size-4", results.isFetching && "animate-spin")}
              />
              {DISCOVER.unavailable.retry}
            </button>
          )}
          <Link href={VENDORS_ROUTES.add} className={secondaryButton}>
            <PenLine aria-hidden className="size-4" />
            {DISCOVER.unavailable.addByHand}
          </Link>
        </div>
      </div>
    );
  }
  return <ListSkeleton rows={3} />;
}

function PlaceCard({ place, onAdd }: Readonly<{ place: DiscoveredVendorDto; onAdd: () => void }>) {
  const maps = mapsSearchUrl({
    venueName: place.name,
    address: place.address,
    googlePlaceId: place.googlePlaceId,
  });
  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-4 sm:flex-row sm:items-start sm:justify-between md:p-5">
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-title-lg text-graphite wrap-break-word">{place.name}</h3>
        <Rating rating={place.rating} count={place.ratingCount} />
        {place.address && (
          <p className="mt-1 flex gap-1.5 text-body-sm text-plum">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">{place.address}</span>
          </p>
        )}
        {maps && (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={cn(textLink, "mt-1")}
          >
            {DISCOVER.openInMaps}
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {place.myVendor ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-label-md text-gold-deep">
              <CheckCircle2 aria-hidden className="size-4" />
              {place.myVendor.archived ? DISCOVER.archivedInMyVendors : DISCOVER.inMyVendors}
            </span>
            <Link
              href={VENDORS_ROUTES.vendor(place.myVendor.id)}
              aria-label={DISCOVER.viewLabel(place.name)}
              className={secondaryButton}
            >
              {DISCOVER.view}
            </Link>
            {/* Adding an archived place brings it back (decided 2026-11-24, QA D1). */}
            {place.myVendor.archived && (
              <button
                type="button"
                onClick={onAdd}
                aria-label={DISCOVER.restoreLabel(place.name)}
                className={primaryButton}
              >
                <RotateCcw aria-hidden className="size-4" />
                {DISCOVER.restore}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            aria-label={DISCOVER.addLabel(place.name)}
            className={cn(primaryButton, "w-full sm:w-auto")}
          >
            <Plus aria-hidden className="size-4" />
            {DISCOVER.add}
          </button>
        )}
      </div>
    </li>
  );
}

function Rating({ rating, count }: Readonly<{ rating: number | null; count: number | null }>) {
  if (rating === null) {
    return <p className="mt-1 text-body-sm text-plum">{DISCOVER.noRating}</p>;
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-body-sm text-graphite">
      <Star aria-hidden className="size-4 fill-gold text-gold-deep" />
      <span className="sr-only">{DISCOVER.rating(ratingFormat.format(rating))}</span>
      <span aria-hidden className="font-semibold">
        {ratingFormat.format(rating)}
      </span>
      {count !== null && <span className="text-plum">· {DISCOVER.ratingCount(count)}</span>}
    </p>
  );
}

function EmptyState({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-sand bg-white/60 px-6 py-10 text-center">
      <Search aria-hidden className="size-8 text-gold-deep" />
      <p className="font-serif text-title-lg text-graphite">{title}</p>
      <p className="max-w-md text-body-md text-plum">{description}</p>
    </div>
  );
}
