"use client";

import { CheckCircle2, RefreshCw, Trash2, Video } from "lucide-react";
import { useState, type FormEvent } from "react";

import {
  dangerButton,
  dangerOutlineButton,
  focusRing,
  primaryButton,
  secondaryButton,
} from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/form-controls";
import { YouTubePlayer } from "@/components/ui/youtube-player";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { youTubeVideoId } from "@/lib/youtube";
import type { LivestreamSettingsDto } from "@/modules/weddings/wedding.types";

import { useLivestream, useUpdateLivestream } from "../api";
import { LIVESTREAM } from "../livestream-content";

/**
 * /app/livestream (PRD §9.24; API_DESIGN §70–72): paste the YouTube link,
 * preview the player, show it on the website or not, or remove it.
 */
export function LivestreamScreen() {
  const settings = useLivestream();

  let body;
  if (settings.data) {
    body = <LivestreamSettings settings={settings.data} />;
  } else if (settings.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{LIVESTREAM.loadError.title}</p>
        <button type="button" onClick={() => void settings.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {LIVESTREAM.loadError.retry}
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
        <div className="h-56 rounded-3xl bg-sand" />
        <div className="h-72 rounded-3xl bg-sand" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:gap-6">
      <header>
        <p className="text-eyebrow text-gold-deep uppercase">{LIVESTREAM.eyebrow}</p>
        <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
          {LIVESTREAM.title}
        </h1>
        <p className="mt-1 max-w-2xl text-body-md text-plum">{LIVESTREAM.description}</p>
      </header>
      {body}
    </div>
  );
}

function LivestreamSettings({ settings }: Readonly<{ settings: LivestreamSettingsDto }>) {
  const update = useUpdateLivestream();
  const [link, setLink] = useState(settings.youtubeUrl ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [failed, setFailed] = useState(false);

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.details?.youtubeUrl) {
      setLinkError(error.details.youtubeUrl);
      return;
    }
    setFailed(true);
  };

  const change = (body: Parameters<typeof update.mutate>[0], done: string) => {
    setNotice(null);
    setFailed(false);
    update.mutate(body, {
      onSuccess: (saved) => {
        setLink(saved.youtubeUrl ?? "");
        setNotice(done);
      },
      onError,
    });
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!youTubeVideoId(link)) {
      setLinkError(LIVESTREAM.link.invalid);
      return;
    }
    setLinkError(null);
    change({ youtubeUrl: link.trim() }, LIVESTREAM.link.saved);
  };

  const hasLink = settings.youtubeUrl !== null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <form
          noValidate
          onSubmit={save}
          aria-labelledby="livestream-link"
          className="flex flex-col gap-4 rounded-3xl border border-sand bg-white p-5 md:p-6"
        >
          <h2 id="livestream-link" className="font-serif text-title-lg text-graphite">
            {LIVESTREAM.link.title}
          </h2>
          <TextField
            label={LIVESTREAM.link.label}
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder={LIVESTREAM.link.placeholder}
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setLinkError(null);
            }}
            error={linkError ?? undefined}
            hint={<p className="text-body-sm text-plum">{LIVESTREAM.link.hint}</p>}
          />
          <button
            type="submit"
            disabled={update.isPending}
            aria-busy={update.isPending || undefined}
            className={cn(primaryButton, "self-start")}
          >
            {update.isPending ? LIVESTREAM.link.saving : LIVESTREAM.link.save}
          </button>
        </form>

        <section
          aria-label={LIVESTREAM.show.label}
          className="flex flex-col gap-4 rounded-3xl border border-sand bg-white p-5 md:p-6"
        >
          <button
            type="button"
            role="switch"
            aria-checked={settings.isEnabled}
            disabled={!hasLink || update.isPending}
            onClick={() =>
              change(
                { isEnabled: !settings.isEnabled },
                settings.isEnabled ? LIVESTREAM.show.off : LIVESTREAM.show.on,
              )
            }
            className={cn(
              "flex w-full items-center justify-between gap-4 text-left disabled:cursor-not-allowed",
              focusRing,
            )}
          >
            <span className="min-w-0">
              <span className="block text-title-md text-graphite">{LIVESTREAM.show.label}</span>
              <span className="block text-body-sm text-plum">
                {hasLink ? LIVESTREAM.show.hint : LIVESTREAM.show.needsLink}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
                settings.isEnabled ? "bg-burgundy" : "bg-sand",
                !hasLink && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-[left]",
                  settings.isEnabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </span>
          </button>
          {hasLink && (
            <button
              type="button"
              onClick={() => setRemoving(true)}
              className={cn(dangerOutlineButton, "self-start")}
            >
              <Trash2 aria-hidden className="size-4" />
              {LIVESTREAM.remove.action}
            </button>
          )}
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
        {failed && (
          <p role="alert" className="text-body-md text-destructive">
            {LIVESTREAM.saveError}
          </p>
        )}
      </div>

      <section
        aria-labelledby="livestream-preview"
        className="flex flex-col gap-3 rounded-3xl border border-sand bg-white p-5 md:p-6"
      >
        <h2 id="livestream-preview" className="font-serif text-title-lg text-graphite">
          {LIVESTREAM.preview.title}
        </h2>
        {settings.embedUrl ? (
          <>
            <YouTubePlayer
              embedUrl={settings.embedUrl}
              title={LIVESTREAM.preview.playerTitle}
              className="rounded-2xl"
            />
            <p className="text-body-sm text-plum">{LIVESTREAM.preview.caption}</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-ivory px-6 py-10 text-center">
            <Video aria-hidden className="size-8 text-gold-deep" />
            <p className="font-serif text-title-lg text-graphite">{LIVESTREAM.empty.title}</p>
            <p className="max-w-xs text-body-md text-plum">{LIVESTREAM.empty.description}</p>
          </div>
        )}
      </section>

      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        title={LIVESTREAM.remove.title}
        description={LIVESTREAM.remove.description}
      >
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setRemoving(false)} className={secondaryButton}>
            {LIVESTREAM.remove.cancel}
          </button>
          <button
            type="button"
            disabled={update.isPending}
            onClick={() => {
              setRemoving(false);
              change({ youtubeUrl: null, isEnabled: false }, LIVESTREAM.remove.removed);
            }}
            className={dangerButton}
          >
            {LIVESTREAM.remove.confirm}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
