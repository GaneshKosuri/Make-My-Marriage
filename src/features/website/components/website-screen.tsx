"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  ImagePlus,
  MessageCircle,
  RefreshCw,
  Rocket,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { focusRing, primaryButton, secondaryButton, textLink } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/form-controls";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { buildWhatsAppShareUrl } from "@/lib/whatsapp";
import {
  COVER_MAX_SIZE_BYTES,
  COVER_MIME_TYPES,
  WEBSITE_THEMES,
  WELCOME_MESSAGE_MAX_LENGTH,
  type WebsiteTheme,
} from "@/modules/weddings/wedding.constants";
import type { WebsiteSettingsDto } from "@/modules/weddings/wedding.types";

import { useUpdateWebsite, useUploadCover, useWebsiteSettings, type WebsiteChange } from "../api";
import { THEME_CHOICES, WEBSITE, WEBSITE_ROUTES } from "../website-content";
import { ThemeThumbnail } from "./theme-thumbnail";

/**
 * /app/website (PRD §9.18–9.19; API_DESIGN §67–68, §83): publish the website,
 * share its address, choose the theme, set the cover photo and welcome
 * message, and decide whether the gallery button shows.
 */
/**
 * The server's own words when they help (a refused photo, too many uploads, a
 * cover changed elsewhere); otherwise the general "try again" (QA CL).
 */
function coverFailure(error: unknown): string {
  if (
    error instanceof ApiError &&
    (error.code === "UPLOAD_ERROR" || error.code === "RATE_LIMITED" || error.code === "CONFLICT") &&
    error.message
  ) {
    return error.message;
  }
  return WEBSITE.cover.failed;
}

export function WebsiteScreen({ coupleName }: Readonly<{ coupleName: string }>) {
  const settings = useWebsiteSettings();

  let body;
  if (settings.data) {
    body = <WebsiteSettings settings={settings.data} coupleName={coupleName} />;
  } else if (settings.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{WEBSITE.loadError.title}</p>
        <button type="button" onClick={() => void settings.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {WEBSITE.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = (
      <div aria-busy="true" aria-label="Loading" className="flex animate-pulse flex-col gap-6">
        <div className="h-44 rounded-3xl bg-sand" />
        <div className="h-64 rounded-3xl bg-sand" />
      </div>
    );
  }
  return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:gap-6">{body}</div>;
}

interface FormState {
  theme: WebsiteTheme;
  welcomeMessage: string;
  showGallery: boolean;
}

const sameForm = (a: FormState, b: FormState) =>
  a.theme === b.theme &&
  a.welcomeMessage.trim() === b.welcomeMessage.trim() &&
  a.showGallery === b.showGallery;

const formOf = (settings: WebsiteSettingsDto): FormState => ({
  theme: settings.theme,
  welcomeMessage: settings.welcomeMessage ?? "",
  showGallery: settings.showGallery,
});

function WebsiteSettings({
  settings,
  coupleName,
}: Readonly<{ settings: WebsiteSettingsDto; coupleName: string }>) {
  const update = useUpdateWebsite();
  const cover = useUploadCover();
  const [saved, setSaved] = useState<FormState>(() => formOf(settings));
  const [form, setForm] = useState<FormState>(saved);

  // A newer copy from the server (another member saved, a refetch on focus):
  // it becomes the saved state, and replaces the form unless the form has
  // unsaved edits, which are kept (QA W2, as for events in Phase 2 R4).
  const server = formOf(settings);
  if (!sameForm(server, saved)) {
    const editing = !sameForm(form, saved);
    setSaved(server);
    if (!editing) setForm(server);
  }
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [coverProblem, setCoverProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"publish" | "unpublish" | null>(null);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const changes: WebsiteChange = {};
  if (form.theme !== saved.theme) changes.theme = form.theme;
  if (form.welcomeMessage.trim() !== saved.welcomeMessage.trim()) {
    changes.welcomeMessage = form.welcomeMessage.trim() || null;
  }
  if (form.showGallery !== saved.showGallery) changes.showGallery = form.showGallery;
  const dirty = Object.keys(changes).length > 0;
  const tooLong = form.welcomeMessage.length > WELCOME_MESSAGE_MAX_LENGTH;

  const patch = (
    body: WebsiteChange,
    done: string,
    after?: (next: WebsiteSettingsDto) => void,
    fail: (error: Error) => void = () => setProblem(WEBSITE.saveBar.error),
  ) => {
    setNotice(null);
    setProblem(null);
    update.mutate(body, {
      onSuccess: (next) => {
        setNotice(done);
        after?.(next);
      },
      onError: fail,
    });
  };

  const save = () =>
    patch(changes, WEBSITE.saveBar.saved, (next) => {
      const fresh = formOf(next);
      setSaved(fresh);
      setForm(fresh);
    });

  const chooseCover = (file: File | undefined) => {
    if (!file) return;
    setNotice(null);
    setCoverProblem(null);
    if (
      !(COVER_MIME_TYPES as readonly string[]).includes(file.type) ||
      file.size === 0 ||
      file.size > COVER_MAX_SIZE_BYTES
    ) {
      setCoverProblem(WEBSITE.cover.invalid);
      return;
    }
    cover.mutate(file, {
      onSuccess: () => setNotice(WEBSITE.cover.saved),
      onError: (error) => setCoverProblem(coverFailure(error)),
    });
  };

  const removeCover = () => {
    setCoverProblem(null);
    patch({ coverImageObjectKey: null }, WEBSITE.cover.removed, undefined, (error) =>
      setCoverProblem(coverFailure(error)),
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.url);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  };

  const busy = update.isPending || cover.isPending;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{WEBSITE.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {WEBSITE.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{WEBSITE.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${WEBSITE_ROUTES.preview}?theme=${form.theme}`}
            target="_blank"
            className={secondaryButton}
          >
            <Eye aria-hidden className="size-4" />
            {WEBSITE.preview}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(settings.isPublished ? "unpublish" : "publish")}
            className={settings.isPublished ? secondaryButton : primaryButton}
          >
            {!settings.isPublished && <Rocket aria-hidden className="size-4" />}
            {settings.isPublished ? WEBSITE.unpublish : WEBSITE.publish}
          </button>
        </div>
      </header>

      <section
        aria-label={WEBSITE.status.address}
        className="flex flex-col gap-4 rounded-3xl bg-linear-to-r from-burgundy to-burgundy-deep p-5 text-ivory shadow-md md:p-6"
      >
        <p
          className={cn(
            "self-start rounded-full px-3 py-1 text-label-sm",
            settings.isPublished ? "bg-gold-light text-burgundy-deep" : "bg-white/10 text-ivory",
          )}
        >
          {settings.isPublished ? WEBSITE.status.published : WEBSITE.status.draft}
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor="website-address" className="text-eyebrow text-gold-light uppercase">
            {WEBSITE.status.address}
          </label>
          <input
            id="website-address"
            readOnly
            value={settings.url}
            onFocus={(event) => event.currentTarget.select()}
            className="h-12 w-full min-w-0 rounded-xl bg-white px-4 text-body-md text-graphite"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border border-gold-light/70 px-5 text-label-md text-ivory hover:bg-white/10",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light",
            )}
          >
            <Copy aria-hidden className="size-4" />
            {copied === "yes" ? WEBSITE.status.copied : WEBSITE.status.copy}
          </button>
          <a
            href={buildWhatsAppShareUrl(WEBSITE.whatsappMessage(coupleName, settings.url))}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full border border-gold-light/70 px-5 text-label-md text-ivory hover:bg-white/10",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light",
            )}
          >
            <MessageCircle aria-hidden className="size-4" />
            {WEBSITE.status.whatsapp}
          </a>
        </div>
        <p role="status" className="text-body-sm text-ivory/80">
          {copied === "failed"
            ? WEBSITE.status.copyFailed
            : !settings.isPublished
              ? WEBSITE.status.draftShareNote
              : ""}
        </p>
      </section>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}

      <section
        aria-labelledby="website-theme"
        className="flex flex-col gap-4 rounded-3xl border border-sand bg-white p-5 md:p-6"
      >
        <div>
          <h2 id="website-theme" className="font-serif text-title-lg text-graphite">
            {WEBSITE.theme.title}
          </h2>
          <p className="text-body-sm text-plum">{WEBSITE.theme.description}</p>
        </div>
        <div
          role="radiogroup"
          aria-labelledby="website-theme"
          className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0"
        >
          {WEBSITE_THEMES.map((theme) => {
            const selected = form.theme === theme;
            return (
              <button
                key={theme}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setForm((last) => ({ ...last, theme }))}
                className={cn(
                  "relative flex w-[70%] shrink-0 snap-start flex-col gap-2 rounded-2xl border-2 bg-ivory p-3 text-left md:w-auto",
                  selected ? "border-burgundy" : "border-sand hover:border-gold",
                  focusRing,
                )}
              >
                {selected && (
                  <span className="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full bg-gold text-white">
                    <Check aria-hidden className="size-4" />
                  </span>
                )}
                <ThemeThumbnail theme={theme} />
                <span className="text-title-md text-graphite">{THEME_CHOICES[theme].name}</span>
                <span className="text-body-sm text-plum">{THEME_CHOICES[theme].description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="website-cover"
        className="flex flex-col gap-4 rounded-3xl border border-sand bg-white p-5 md:p-6"
      >
        <div>
          <h2 id="website-cover" className="font-serif text-title-lg text-graphite">
            {WEBSITE.cover.title}
          </h2>
          <p className="text-body-sm text-plum">{WEBSITE.cover.description}</p>
        </div>
        {settings.coverImageUrl ? (
          // A signed storage link: next/image cannot optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.coverImageUrl}
            alt={WEBSITE.cover.alt}
            className="aspect-video w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sand bg-ivory p-6 text-center">
            <ImagePlus aria-hidden className="size-8 text-gold-deep" />
            <p className="max-w-sm text-body-md text-plum">{WEBSITE.cover.empty}</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={COVER_MIME_TYPES.join(",")}
          aria-label={WEBSITE.cover.add}
          className="sr-only"
          onChange={(event) => {
            chooseCover(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            aria-busy={cover.isPending || undefined}
            onClick={() => fileRef.current?.click()}
            className={secondaryButton}
          >
            <ImagePlus aria-hidden className="size-4" />
            {cover.isPending
              ? WEBSITE.cover.uploading
              : settings.coverImageUrl
                ? WEBSITE.cover.change
                : WEBSITE.cover.add}
          </button>
          {settings.coverImageUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={removeCover}
              className={cn(secondaryButton, "text-destructive")}
            >
              <Trash2 aria-hidden className="size-4" />
              {WEBSITE.cover.remove}
            </button>
          )}
          <p className="text-body-sm text-plum">{WEBSITE.cover.hint}</p>
        </div>
        {coverProblem && (
          <p role="alert" className="text-body-sm text-destructive">
            {coverProblem}
          </p>
        )}
      </section>

      <section
        aria-labelledby="website-welcome"
        className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-5 md:p-6"
      >
        <h2 id="website-welcome" className="font-serif text-title-lg text-graphite">
          {WEBSITE.welcome.title}
        </h2>
        <TextAreaField
          label={WEBSITE.welcome.label}
          rows={4}
          placeholder={WEBSITE.welcome.placeholder}
          value={form.welcomeMessage}
          onChange={(event) => setForm((last) => ({ ...last, welcomeMessage: event.target.value }))}
          error={tooLong ? "Keep the welcome message under 1,000 characters" : undefined}
          hint={
            <p className="flex justify-between gap-3 text-body-sm text-plum">
              <span>{WEBSITE.welcome.hint}</span>
              <span aria-hidden>
                {WEBSITE.welcome.count(form.welcomeMessage.length, WELCOME_MESSAGE_MAX_LENGTH)}
              </span>
            </p>
          }
        />
      </section>

      <section
        aria-labelledby="website-on-site"
        className="flex flex-col gap-4 rounded-3xl border border-sand bg-white p-5 md:p-6"
      >
        <h2 id="website-on-site" className="font-serif text-title-lg text-graphite">
          {WEBSITE.onSite.title}
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={form.showGallery}
          onClick={() => setForm((last) => ({ ...last, showGallery: !last.showGallery }))}
          className={cn("flex w-full items-center justify-between gap-4 text-left", focusRing)}
        >
          <span className="min-w-0">
            <span className="block text-title-md text-graphite">
              {WEBSITE.onSite.gallery.label}
            </span>
            <span className="block text-body-sm text-plum">{WEBSITE.onSite.gallery.hint}</span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
              form.showGallery ? "bg-burgundy" : "bg-sand",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[left]",
                form.showGallery ? "left-[22px]" : "left-0.5",
              )}
            />
          </span>
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ivory p-4">
          <p className="flex items-center gap-2 text-body-md text-graphite">
            <CalendarDays aria-hidden className="size-5 shrink-0 text-gold-deep" />
            {WEBSITE.onSite.events}
          </p>
          <Link href={WEBSITE_ROUTES.events} className={textLink}>
            {WEBSITE.onSite.manageEvents}
          </Link>
        </div>
      </section>

      {(dirty || problem) && (
        <div className="sticky bottom-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand bg-white p-3 shadow-lg md:bottom-4">
          <p className="flex items-center gap-2 pl-1 text-body-md text-graphite">
            {problem ? (
              <span role="alert" className="text-destructive">
                {problem}
              </span>
            ) : (
              <>
                <span aria-hidden className="size-2 rounded-full bg-burgundy" />
                {WEBSITE.saveBar.unsaved}
              </>
            )}
          </p>
          {dirty && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={update.isPending}
                onClick={() => {
                  setForm(saved);
                  setProblem(null);
                }}
                className={secondaryButton}
              >
                {WEBSITE.saveBar.discard}
              </button>
              <button
                type="button"
                disabled={update.isPending || tooLong}
                aria-busy={update.isPending || undefined}
                onClick={save}
                className={primaryButton}
              >
                {update.isPending ? WEBSITE.saveBar.saving : WEBSITE.saveBar.save}
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={
          confirming === "unpublish" ? WEBSITE.unpublishDialog.title : WEBSITE.publishDialog.title
        }
        description={
          confirming === "unpublish"
            ? WEBSITE.unpublishDialog.description
            : WEBSITE.publishDialog.description
        }
      >
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setConfirming(null)} className={secondaryButton}>
            {confirming === "unpublish"
              ? WEBSITE.unpublishDialog.cancel
              : WEBSITE.publishDialog.cancel}
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => {
              const publishing = confirming === "publish";
              setConfirming(null);
              patch(
                { isPublished: publishing },
                publishing ? WEBSITE.publishDialog.done : WEBSITE.unpublishDialog.done,
              );
            }}
            className={primaryButton}
          >
            {confirming === "unpublish"
              ? WEBSITE.unpublishDialog.confirm
              : WEBSITE.publishDialog.confirm}
          </button>
        </div>
      </Dialog>
    </>
  );
}
