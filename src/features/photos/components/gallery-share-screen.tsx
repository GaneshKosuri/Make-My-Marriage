"use client";

import { ArrowLeft, Copy, Download, MessageCircle, Printer, RefreshCw } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { focusRing, primaryButton, secondaryButton, textLink } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { notify } from "@/lib/notify";
import type { GallerySettingsDto } from "@/modules/weddings/wedding.types";

import { useGallerySettings, useUpdateGallerySettings } from "../api";
import { GALLERY_ROUTES, SHARE } from "../gallery-content";
import { PageSkeleton, SkeletonCard } from "@/components/ui/page-skeleton";

/** Graphite modules on white: what scanners read best (brand ink, not pure black). */
const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#2b2326", light: "#ffffff" },
} as const;

function saveFile(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** The QR as an SVG data URL, drawn in the browser (API §84 Option A). */
function useQrSvg(url: string | undefined) {
  const [svg, setSvg] = useState<{ url: string; data: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void QRCode.toString(url, { ...QR_OPTIONS, type: "svg" }).then((markup) => {
      if (!cancelled) setSvg({ url, data: markup });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return svg && svg.url === url ? svg.data : null;
}

/**
 * /app/photos/qr (PRD §9.23; API_DESIGN §73–74, §84): the gallery and guest
 * upload switches, the stable link (copy or WhatsApp), and the printable QR
 * card with PNG and SVG downloads.
 */
export function GalleryShareScreen({
  coupleName,
  dateLine,
}: Readonly<{
  /** "Akshay & Princi" */
  coupleName: string;
  /** "14 February 2027 · Dehradun" */
  dateLine: string;
}>) {
  const settings = useGallerySettings();

  let body;
  if (settings.data) {
    body = <ShareBody settings={settings.data} coupleName={coupleName} dateLine={dateLine} />;
  } else if (settings.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{SHARE.loadError.title}</p>
        <button type="button" onClick={() => void settings.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {SHARE.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = (
      <div
        aria-busy="true"
        aria-label="Loading"
        className="grid animate-pulse gap-6 lg:grid-cols-2"
      >
        <div className="h-72 rounded-3xl bg-sand" />
        <div className="h-96 rounded-3xl bg-sand" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:gap-6 print:max-w-none">
      <header className="print:hidden">
        <Link href={GALLERY_ROUTES.gallery} className={textLink}>
          <ArrowLeft aria-hidden className="size-4" />
          {SHARE.back}
        </Link>
        <p className="mt-3 text-eyebrow text-gold-deep uppercase">{SHARE.eyebrow}</p>
        <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
          {SHARE.title}
        </h1>
        <p className="mt-1 max-w-2xl text-body-md text-plum">{SHARE.description}</p>
      </header>
      {body}
    </div>
  );
}

function ShareBody({
  settings,
  coupleName,
  dateLine,
}: Readonly<{ settings: GallerySettingsDto; coupleName: string; dateLine: string }>) {
  const update = useUpdateGallerySettings();
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const qrSvg = useQrSvg(settings.galleryUrl);
  const on = settings.isEnabled;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.galleryUrl);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  };

  const downloadPng = async () => {
    const png = await QRCode.toDataURL(settings.galleryUrl, { ...QR_OPTIONS, width: 1024 });
    saveFile(png, `${SHARE.fileName}.png`);
  };
  const downloadSvg = () => {
    if (!qrSvg) return;
    const url = URL.createObjectURL(new Blob([qrSvg], { type: "image/svg+xml" }));
    saveFile(url, `${SHARE.fileName}.svg`);
    // Some browsers start the download after click() returns (QA CL).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section
        aria-labelledby="gallery-access"
        className="flex flex-col gap-5 rounded-3xl border border-sand bg-white p-5 md:p-6 print:hidden"
      >
        <h2 id="gallery-access" className="font-serif text-title-lg text-graphite">
          {SHARE.access.title}
        </h2>
        <div className="flex flex-col divide-y divide-sand">
          <SettingSwitch
            label={SHARE.access.gallery.label}
            hint={SHARE.access.gallery.hint}
            checked={on}
            disabled={update.isPending}
            onChange={(isEnabled) =>
              update.mutate(
                { isEnabled },
                { onSuccess: () => notify.success(SHARE.access.galleryChanged(isEnabled)) },
              )
            }
          />
          <SettingSwitch
            label={SHARE.access.uploads.label}
            hint={on ? SHARE.access.uploads.hint : SHARE.access.uploadsNeedGallery}
            checked={on && settings.guestUploadsEnabled}
            disabled={update.isPending || !on}
            onChange={(guestUploadsEnabled) =>
              update.mutate(
                { guestUploadsEnabled },
                {
                  onSuccess: () => notify.success(SHARE.access.uploadsChanged(guestUploadsEnabled)),
                },
              )
            }
          />
        </div>
        {update.isError && (
          <p role="alert" className="text-body-sm text-destructive">
            {SHARE.access.saveError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="gallery-link" className="text-label-md text-graphite">
            {SHARE.link.label}
          </label>
          <input
            id="gallery-link"
            readOnly
            value={settings.galleryUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="h-12 w-full min-w-0 rounded-xl border border-sand bg-ivory px-4 text-body-md text-graphite"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className={secondaryButton}>
              <Copy aria-hidden className="size-4" />
              {copied === "yes" ? SHARE.link.copied : SHARE.link.copy}
            </button>
            <a
              href={buildWhatsAppShareUrl(SHARE.whatsappMessage(coupleName, settings.galleryUrl))}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryButton}
            >
              <MessageCircle aria-hidden className="size-4" />
              {SHARE.link.whatsapp}
            </a>
          </div>
          <p role="status" className="text-body-sm text-plum">
            {copied === "failed" ? SHARE.link.copyFailed : ""}
          </p>
        </div>
        {!on && (
          <p className="rounded-xl bg-sand/60 p-3 text-body-sm text-graphite">{SHARE.off.note}</p>
        )}
      </section>

      <section aria-label={SHARE.card.heading} className="flex flex-col items-center gap-4">
        <div className="relative w-full max-w-sm">
          <QrCard coupleName={coupleName} dateLine={dateLine} qrSvg={qrSvg} />
          {!on && (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-ivory/80 p-6 text-center print:hidden">
              <p className="font-serif text-title-lg text-graphite">{SHARE.off.overlay}</p>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 print:hidden">
          <button
            type="button"
            disabled={!on}
            onClick={() => void downloadPng()}
            className={secondaryButton}
          >
            <Download aria-hidden className="size-4" />
            {SHARE.downloadPng}
          </button>
          <button
            type="button"
            disabled={!on || !qrSvg}
            onClick={downloadSvg}
            className={secondaryButton}
          >
            <Download aria-hidden className="size-4" />
            {SHARE.downloadSvg}
          </button>
          <button
            type="button"
            disabled={!on}
            onClick={() => window.print()}
            className={primaryButton}
          >
            <Printer aria-hidden className="size-4" />
            {SHARE.print}
          </button>
        </div>
      </section>
    </div>
  );
}

/** The printable card: burgundy heading, the QR on white, the couple and date. */
function QrCard({
  coupleName,
  dateLine,
  qrSvg,
}: Readonly<{ coupleName: string; dateLine: string; qrSvg: string | null }>) {
  return (
    <div
      data-print-card
      className="overflow-hidden rounded-3xl border border-gold/60 bg-ivory shadow-md print:shadow-none"
    >
      <div className="bg-linear-to-br from-burgundy to-burgundy-deep px-6 py-6 text-center text-ivory">
        <p className="font-serif text-headline-sm">{SHARE.card.heading}</p>
        <p className="mt-1 text-eyebrow text-gold-light uppercase">{coupleName}</p>
      </div>
      <div className="flex flex-col items-center gap-4 px-6 pt-6 pb-7 text-center">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {qrSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
              alt={SHARE.card.qrLabel(coupleName)}
              className="size-48 md:size-56"
            />
          ) : (
            <div className="size-48 animate-pulse rounded-lg bg-sand md:size-56" />
          )}
        </div>
        <p className="font-serif text-title-lg text-graphite">{SHARE.card.scan(coupleName)}</p>
        <p className="text-eyebrow text-plum uppercase">{dateLine}</p>
      </div>
    </div>
  );
}

function SettingSwitch({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-4 py-4 text-left disabled:cursor-not-allowed",
        focusRing,
      )}
    >
      <span className="min-w-0">
        <span className="block text-title-md text-graphite">{label}</span>
        <span className="block text-body-sm text-plum">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-burgundy" : "bg-sand",
          disabled && "opacity-60",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[left]",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

/** The whole page while it loads: the page's Suspense fallback (no blank gap). */
export function GalleryShareSkeleton() {
  return (
    <PageSkeleton
      wide
      above={
        <Link href={GALLERY_ROUTES.gallery} className={cn(textLink, "self-start")}>
          <ArrowLeft aria-hidden className="size-4" />
          {SHARE.back}
        </Link>
      }
      eyebrow={SHARE.eyebrow}
      title={SHARE.title}
      description={SHARE.description}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-96" />
      </div>
    </PageSkeleton>
  );
}
