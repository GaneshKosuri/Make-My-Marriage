"use client";

import {
  ArchiveX,
  Plus,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  dangerButton,
  focusRing,
  primaryButton,
  secondaryButton,
  textLink,
} from "@/components/ui/button-styles";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Dialog } from "@/components/ui/dialog";
import { EVENTS_ROUTES } from "@/features/events/events-content";
import { useExpenses } from "@/features/expenses/api";
import {
  EXPENSES,
  EXPENSES_ROUTES,
  expenseCategoryLabel,
} from "@/features/expenses/expenses-content";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatInstant } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { eventDateTile, formatShortDate, mapsSearchUrl } from "@/lib/schedule";
import type { VendorDto } from "@/modules/vendors/vendor.types";

import { useArchiveVendor, useVendor } from "../api";
import { categoryLabel, VENDORS, VENDORS_ROUTES } from "../vendors-content";
import { VendorFormDialog } from "./vendor-form-dialog";

const DETAIL = VENDORS.detail;
const LONG_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/** Buttons on the burgundy card, as on the dashboard's wedding card. */
const onBurgundy = {
  secondary: cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ivory/30 bg-ivory/10 px-5 text-label-md text-ivory hover:bg-ivory/20",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory",
  ),
  primary: cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ivory px-5 text-label-md text-burgundy hover:bg-white",
    focusRing,
    "focus-visible:outline-ivory",
  ),
};

/**
 * /app/vendors/[vendorId] (PRD §9.16, API_DESIGN §62–64): who the vendor is,
 * how to reach them, what was agreed and which events they work at, with edit
 * and archive. Archived vendors are read-only.
 */
export function VendorDetailScreen({
  vendorId,
  timeZone,
}: Readonly<{ vendorId: string; timeZone: string }>) {
  const vendor = useVendor(vendorId);

  let body;
  if (vendor.data) {
    body = <VendorDetail vendor={vendor.data} timeZone={timeZone} />;
  } else if (vendor.isError) {
    const missing =
      vendor.error instanceof ApiError &&
      (vendor.error.code === "NOT_FOUND" || vendor.error.code === "VALIDATION_ERROR");
    body = missing ? (
      <div className="rounded-3xl border border-dashed border-sand bg-white px-5 py-10 text-center">
        <p className="font-serif text-title-lg text-graphite">{DETAIL.notFound.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-body-md text-plum">
          {DETAIL.notFound.description}
        </p>
        <Link href={VENDORS_ROUTES.list} className={cn(primaryButton, "mt-5")}>
          {DETAIL.back}
        </Link>
      </div>
    ) : (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{VENDORS.loadError.title}</p>
        <button type="button" onClick={() => void vendor.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", vendor.isFetching && "animate-spin")} />
          {VENDORS.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = <DetailSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-4 md:gap-6">
      <Link href={VENDORS_ROUTES.list} className={cn(textLink, "self-start")}>
        <ArrowLeft aria-hidden className="size-4" />
        {DETAIL.back}
      </Link>
      {body}
    </div>
  );
}

function VendorDetail({ vendor, timeZone }: Readonly<{ vendor: VendorDto; timeZone: string }>) {
  const router = useRouter();
  const archive = useArchiveVendor();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const archived = vendor.archivedAt !== null;
  const contactLine = [vendor.contactPerson, vendor.phone].filter(Boolean).join(" · ");
  const maps = mapsSearchUrl({
    venueName: vendor.name,
    address: vendor.address,
    googlePlaceId: vendor.googlePlaceId,
  });

  return (
    <>
      <section
        aria-labelledby="vendor-name"
        className="relative overflow-hidden rounded-3xl bg-burgundy p-5 text-ivory shadow-md md:p-8"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-eyebrow text-gold-light uppercase">
              {categoryLabel(vendor.category)}
            </p>
            <h1
              id="vendor-name"
              className="mt-2 font-serif text-headline-md wrap-anywhere md:text-headline-lg"
            >
              {vendor.name}
            </h1>
            {contactLine && (
              <p className="mt-2 flex items-center gap-2 text-body-md text-ivory/85">
                <UserRound aria-hidden className="size-4 shrink-0 text-gold-light" />
                <span className="min-w-0 wrap-anywhere">{contactLine}</span>
              </p>
            )}
          </div>
          <div className="shrink-0 rounded-3xl border border-ivory/15 bg-ivory/10 px-6 py-4">
            <p className="text-body-sm text-ivory/80">{DETAIL.agreedCost}</p>
            <p className="font-serif text-headline-sm tabular-nums">
              {vendor.totalAgreedCostPaise === null
                ? DETAIL.noAgreedCost
                : formatINR(vendor.totalAgreedCostPaise)}
            </p>
          </div>
        </div>
        {!archived && (
          <div className="mt-5 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 md:mt-6 md:flex md:flex-wrap">
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                archive.reset();
                setConfirming(true);
              }}
              className={onBurgundy.secondary}
            >
              <ArchiveX aria-hidden className="size-4" />
              {DETAIL.archive}
            </button>
            <button
              type="button"
              onClick={() => {
                setNotice(null);
                setEditing(true);
              }}
              className={onBurgundy.primary}
            >
              <Pencil aria-hidden className="size-4" />
              {DETAIL.edit}
            </button>
          </div>
        )}
      </section>

      {archived && (
        <p className="rounded-2xl border border-sand bg-ivory p-4 text-body-md text-plum">
          {DETAIL.archivedBanner(formatInstant(vendor.archivedAt!, timeZone, LONG_DATE))}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <DashboardCard title={DETAIL.contact}>
          <ContactDetails vendor={vendor} maps={maps} />
        </DashboardCard>

        <DashboardCard title={DETAIL.booking}>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-label-md text-graphite">{DETAIL.events}</p>
              {vendor.events.length === 0 ? (
                <p className="mt-1 text-body-md text-plum">{DETAIL.noEvents}</p>
              ) : (
                <ul className="mt-1 divide-y divide-sand">
                  {vendor.events.map((event) => (
                    <li key={event.id} className="flex items-start gap-3 py-2.5">
                      <CalendarDays aria-hidden className="mt-0.5 size-5 shrink-0 text-gold-deep" />
                      <div className="min-w-0">
                        <Link
                          href={EVENTS_ROUTES.event(event.id)}
                          className={cn(
                            "rounded text-label-md wrap-anywhere text-graphite hover:text-burgundy",
                            focusRing,
                            event.archivedAt && "text-plum line-through",
                          )}
                        >
                          {event.archivedAt ? VENDORS.archivedEvent(event.name) : event.name}
                        </Link>
                        <p className="text-body-sm text-plum">
                          {eventDateTile(event.startsAt, timeZone).label}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {vendor.notes && (
              <div>
                <p className="text-label-md text-graphite">{DETAIL.notes}</p>
                <p className="mt-1 text-body-md wrap-anywhere whitespace-pre-line text-graphite">
                  {vendor.notes}
                </p>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      <VendorExpenses vendor={vendor} />

      {!archived && (
        <VendorFormDialog
          open={editing}
          onClose={() => setEditing(false)}
          vendor={vendor}
          timeZone={timeZone}
          onSaved={(saved) => {
            setEditing(false);
            setNotice(VENDORS.form.updated(saved.name));
          }}
        />
      )}

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={DETAIL.confirmArchive.title(vendor.name)}
        description={DETAIL.confirmArchive.description}
      >
        {archive.isError && (
          <p role="alert" className="mb-4 text-body-md text-destructive">
            {DETAIL.confirmArchive.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
            {DETAIL.confirmArchive.cancel}
          </button>
          <button
            type="button"
            disabled={archive.isPending}
            aria-busy={archive.isPending || undefined}
            onClick={() =>
              archive.mutate(vendor.id, { onSuccess: () => router.push(VENDORS_ROUTES.list) })
            }
            className={dangerButton}
          >
            {DETAIL.confirmArchive.confirm}
          </button>
        </div>
      </Dialog>
    </>
  );
}

/** Enough to total a vendor's expenses in one request (a vendor has a handful). */
const VENDOR_EXPENSES_LIMIT = 100;
/** Expenses listed on the vendor's page; the rest are one link away. */
const VENDOR_EXPENSES_SHOWN = 5;

/**
 * What has been recorded against this vendor: the total and the latest
 * expenses (PRD §9.16 with §9.15). Never a balance or what is still to pay.
 */
function VendorExpenses({ vendor }: Readonly<{ vendor: VendorDto }>) {
  const copy = EXPENSES.vendorCard;
  const expenses = useExpenses({ vendorId: vendor.id, limit: VENDOR_EXPENSES_LIMIT });
  const items = expenses.data?.data ?? [];
  const total = expenses.data?.pagination.total ?? 0;
  const recorded = items.reduce((sum, expense) => sum + expense.amountPaise, 0);

  let body;
  if (expenses.isError) {
    body = <p className="text-body-md text-destructive">{copy.loadError}</p>;
  } else if (!expenses.data) {
    body = <div aria-busy="true" className="h-16 animate-pulse rounded-xl bg-sand" />;
  } else if (total === 0) {
    body = <p className="text-body-md text-plum">{copy.none}</p>;
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {/* Totalled only when every expense came back; past that, the list page has them all. */}
        {total <= items.length && (
          <div>
            <p className="text-body-sm text-plum">{copy.recorded}</p>
            <p className="font-serif text-headline-sm text-graphite tabular-nums">
              {formatINR(recorded)}
            </p>
          </div>
        )}
        <ul className="divide-y divide-sand">
          {items.slice(0, VENDOR_EXPENSES_SHOWN).map((expense) => (
            <li key={expense.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-label-md wrap-break-word text-graphite">{expense.title}</p>
                <p className="text-body-sm text-plum">
                  {formatShortDate(expense.expenseDate)} · {expenseCategoryLabel(expense.category)}
                </p>
              </div>
              <p className="shrink-0 font-semibold text-graphite tabular-nums">
                {formatINR(expense.amountPaise)}
              </p>
            </li>
          ))}
        </ul>
        {total > VENDOR_EXPENSES_SHOWN && (
          <Link href={EXPENSES_ROUTES.forVendor(vendor.id)} className={cn(textLink, "self-start")}>
            {copy.viewAll(total)}
          </Link>
        )}
      </div>
    );
  }

  return (
    <DashboardCard
      title={copy.title}
      actions={
        vendor.archivedAt ? undefined : (
          <Link href={EXPENSES_ROUTES.addForVendor(vendor.id)} className={textLink}>
            <Plus aria-hidden className="size-4" />
            {copy.add}
          </Link>
        )
      }
    >
      {body}
    </DashboardCard>
  );
}

/** Phone, email, website and address, each with the action it allows. */
function ContactDetails({ vendor, maps }: Readonly<{ vendor: VendorDto; maps: string | null }>) {
  const rows: ReactNode[] = [];
  if (vendor.phone) {
    rows.push(
      <ContactRow key="phone" icon={<Phone aria-hidden />} text={vendor.phone}>
        <a href={`tel:${vendor.phone.replace(/[^\d+]/g, "")}`} className={secondaryButton}>
          {DETAIL.call}
        </a>
      </ContactRow>,
    );
  }
  if (vendor.email) {
    rows.push(
      <ContactRow key="email" icon={<Mail aria-hidden />} text={vendor.email}>
        <a href={`mailto:${vendor.email}`} className={secondaryButton}>
          {DETAIL.email}
        </a>
      </ContactRow>,
    );
  }
  if (vendor.website) {
    const host = new URL(vendor.website).host.replace(/^www\./, "");
    rows.push(
      <ContactRow key="website" icon={<Globe aria-hidden />} text={host}>
        <a
          href={vendor.website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={secondaryButton}
        >
          {DETAIL.website}
          <ExternalLink aria-hidden className="size-4" />
        </a>
      </ContactRow>,
    );
  }
  if (vendor.address) {
    rows.push(
      <ContactRow key="address" icon={<MapPin aria-hidden />} text={vendor.address}>
        {maps && (
          <a href={maps} target="_blank" rel="noopener noreferrer" className={textLink}>
            {DETAIL.openInMaps}
            <ExternalLink aria-hidden className="size-4" />
          </a>
        )}
      </ContactRow>,
    );
  }
  if (rows.length === 0) return <p className="text-body-md text-plum">{DETAIL.noContact}</p>;
  return <ul className="divide-y divide-sand">{rows}</ul>;
}

function ContactRow({
  icon,
  text,
  children,
}: Readonly<{ icon: ReactNode; text: string; children: ReactNode }>) {
  return (
    // The action sits beside the text when the card is wide enough, below it otherwise,
    // so an address or website isn't squeezed into breaking mid-word.
    <li className="@container py-3">
      <div className="flex flex-col items-start gap-2 @sm:flex-row @sm:items-center @sm:justify-between @sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 shrink-0 text-gold-deep [&_svg]:size-5">{icon}</span>
          <span className="min-w-0 text-body-md wrap-break-word whitespace-pre-line text-graphite">
            {text}
          </span>
        </div>
        <div className="shrink-0 pl-8 @sm:pl-0">{children}</div>
      </div>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-4">
      <div className="h-44 rounded-3xl bg-sand" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-3xl border border-sand bg-white" />
        <div className="h-40 rounded-3xl border border-sand bg-white" />
      </div>
    </div>
  );
}
