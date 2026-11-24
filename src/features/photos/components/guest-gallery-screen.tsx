"use client";

import { Camera, CheckCircle2, ImagePlus, Lock, Plus, RefreshCw, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { focusRing, primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-controls";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { coupleDisplayName } from "@/lib/couple";
import { formatDateOnly } from "@/lib/dates";
import type { PhotoDto, PublicGalleryDto } from "@/modules/photos/photo.types";

import { guestUploadEndpoints, useInvalidatePhotos, usePublicPhotos } from "../api";
import { GALLERY, GUEST_GALLERY, MEMORIES_ALBUM, UPLOAD } from "../gallery-content";
import { PHOTO_ACCEPT } from "../upload";
import { useUploadQueue } from "../use-upload-queue";
import { PhotoGrid } from "./photo-grid";
import { PhotoViewer } from "./photo-viewer";
import { UploadQueueList } from "./upload-queue-list";

/**
 * /gallery/[token] (PRD §9.22–9.23; API_DESIGN §79–82): the guest gallery,
 * opened from the QR code or link. Guests browse by album and, when the family
 * allows it, add photos from their phone. No account, no download or delete.
 */
export function GuestGalleryScreen({
  token,
  gallery,
}: Readonly<{ token: string; gallery: PublicGalleryDto }>) {
  const [album, setAlbum] = useState<string | undefined>(undefined);
  const [viewing, setViewing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const photos = usePublicPhotos(token, album);
  const couple = coupleDisplayName(gallery.wedding);
  const names = useMemo(
    () => new Map(gallery.events.map((event) => [event.id, event.name])),
    [gallery.events],
  );

  // Switched off (or the link withdrawn) while the page was open.
  const closed = photos.error instanceof ApiError && photos.error.code === "NOT_FOUND";
  if (closed) return <GalleryClosed />;

  const loaded = photos.data?.pages.flatMap((page) => page.data) ?? [];
  const albumOf = (photo: PhotoDto) =>
    (photo.eventId && names.get(photo.eventId)) || GALLERY.albums.memories;
  const albumName = (() => {
    if (album === undefined) return null;
    if (album === MEMORIES_ALBUM) return GALLERY.albums.memories;
    return names.get(album) ?? GALLERY.albums.memories;
  })();

  let body;
  if (photos.data) {
    body =
      loaded.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-sand bg-white/70 px-6 py-10 text-center">
          <Camera aria-hidden className="size-8 text-gold-deep" />
          <p className="font-serif text-title-lg text-graphite">
            {albumName ? GUEST_GALLERY.emptyAlbum(albumName) : GUEST_GALLERY.empty.title}
          </p>
          {gallery.guestUploadsEnabled && (
            <p className="text-body-md text-plum">{GUEST_GALLERY.empty.description}</p>
          )}
        </div>
      ) : (
        <section aria-label={GUEST_GALLERY.eyebrow} className="flex flex-col gap-4">
          <PhotoGrid photos={loaded} onOpen={setViewing} className="md:grid-cols-3" />
          {photos.hasNextPage && (
            <button
              type="button"
              disabled={photos.isFetchingNextPage}
              onClick={() => void photos.fetchNextPage()}
              className={cn(secondaryButton, "self-center")}
            >
              {photos.isFetchingNextPage ? GALLERY.loadingMore : GALLERY.loadMore}
            </button>
          )}
        </section>
      );
  } else if (photos.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-3xl border border-destructive/20 bg-white p-5 text-center"
      >
        <p className="text-body-md text-destructive">{GUEST_GALLERY.loadError.title}</p>
        <button type="button" onClick={() => void photos.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className="size-4" />
          {GUEST_GALLERY.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = (
      <div aria-busy="true" aria-label="Loading" className="grid grid-cols-3 gap-1 sm:gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-sand" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-burgundy to-burgundy-deep px-6 pt-8 pb-12 text-center text-ivory shadow-md">
        <p className="text-eyebrow text-gold-light uppercase">{GUEST_GALLERY.eyebrow}</p>
        <h1 className="mt-2 font-serif text-headline-md wrap-break-word md:text-headline-lg">
          {couple}
        </h1>
        <p className="mt-1 text-body-md text-ivory/85">
          {formatDateOnly(gallery.wedding.weddingDate)}
        </p>
      </header>

      {gallery.guestUploadsEnabled ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            "-mt-12 mx-3 flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-lg",
            focusRing,
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sand text-burgundy">
            <Camera aria-hidden className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-title-lg text-burgundy">
              {GUEST_GALLERY.add}
            </span>
            <span className="block text-body-sm text-plum">{GUEST_GALLERY.addHint}</span>
          </span>
          <Plus aria-hidden className="size-6 shrink-0 text-gold-deep" />
        </button>
      ) : (
        <p className="-mt-10 mx-3 rounded-2xl bg-white p-4 text-center text-body-md text-plum shadow-sm">
          {GUEST_GALLERY.uploadsOff}
        </p>
      )}

      <nav aria-label={GUEST_GALLERY.albumsLabel} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          <AlbumChip
            label={GALLERY.albums.all}
            active={album === undefined}
            onClick={() => setAlbum(undefined)}
          />
          {gallery.events.map((event) => (
            <AlbumChip
              key={event.id}
              label={event.name}
              active={album === event.id}
              onClick={() => setAlbum(event.id)}
            />
          ))}
          <AlbumChip
            label={GALLERY.albums.memories}
            active={album === MEMORIES_ALBUM}
            onClick={() => setAlbum(MEMORIES_ALBUM)}
          />
        </ul>
      </nav>

      {body}

      {adding && (
        <GuestUploadSheet
          token={token}
          events={gallery.events}
          onClose={() => setAdding(false)}
          onSeeGallery={() => {
            setAdding(false);
            setAlbum(undefined);
          }}
        />
      )}

      {viewing !== null && loaded[viewing] && (
        <PhotoViewer
          photos={loaded}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          albumOf={albumOf}
          timeZone={gallery.wedding.timeZone}
        />
      )}
    </div>
  );
}

function AlbumChip({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "inline-flex h-11 items-center rounded-full border px-4 text-label-md",
          active
            ? "border-burgundy bg-burgundy text-ivory"
            : "border-sand bg-white text-graphite hover:bg-sand",
          focusRing,
        )}
      >
        {label}
      </button>
    </li>
  );
}

/** "Add your photos": pick photos, optionally the event, upload, then "Thank you!". */
function GuestUploadSheet({
  token,
  events,
  onClose,
  onSeeGallery,
}: Readonly<{
  token: string;
  events: PublicGalleryDto["events"];
  onClose: () => void;
  onSeeGallery: () => void;
}>) {
  const invalidate = useInvalidatePhotos();
  const queue = useUploadQueue(guestUploadEndpoints(token));
  const [eventId, setEventId] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [finished, setFinished] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    if (queue.running) return;
    if (queue.counts.done > 0) void invalidate();
    queue.clear();
    onClose();
  };

  const upload = async () => {
    await queue.start(eventId);
  };
  // All chosen photos done (and none waiting or failed): the thank-you screen.
  const allDone =
    queue.items.length > 0 && !queue.running && queue.items.every((item) => item.status === "done");
  if (allDone && finished === null) setFinished(queue.counts.done);

  if (finished !== null) {
    return (
      <Dialog open onClose={close} title={GUEST_GALLERY.success.title}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-sand text-gold-deep">
            <CheckCircle2 aria-hidden className="size-9" />
          </span>
          <p className="text-body-lg text-plum">{GUEST_GALLERY.success.description(finished)}</p>
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                void invalidate();
                queue.clear();
                onSeeGallery();
              }}
              className={cn(primaryButton, "h-12")}
            >
              {GUEST_GALLERY.success.seeGallery}
            </button>
            <button
              type="button"
              onClick={() => {
                void invalidate();
                queue.clear();
                setFinished(null);
              }}
              className={cn(secondaryButton, "h-12")}
            >
              {GUEST_GALLERY.success.addMore}
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={close} title={GUEST_GALLERY.sheet.title}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-sand bg-ivory px-4 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-gold-deep shadow-sm">
            <ImagePlus aria-hidden className="size-6" />
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            aria-label={UPLOAD.dropPhone}
            className="sr-only"
            disabled={queue.running}
            onChange={(event) => {
              const files = event.target.files;
              if (files && files.length > 0) setTruncated(queue.add([...files]));
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={queue.running}
            onClick={() => inputRef.current?.click()}
            className={cn(secondaryButton, "h-12")}
          >
            {UPLOAD.dropPhone}
          </button>
          <p className="text-body-sm text-plum">{GUEST_GALLERY.sheet.hint}</p>
        </div>

        {events.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-label-md text-graphite">
              {GUEST_GALLERY.sheet.event}
            </legend>
            <div className="flex flex-wrap gap-2">
              {[...events, { id: "", name: GUEST_GALLERY.sheet.notSure }].map((event) => (
                <label key={event.id || "not-sure"} className="cursor-pointer">
                  <input
                    type="radio"
                    name="guest-event"
                    checked={(eventId ?? "") === event.id}
                    disabled={queue.running}
                    onChange={() => setEventId(event.id || null)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex h-11 items-center rounded-full border border-sand bg-white px-4 text-label-md text-graphite",
                      "peer-checked:border-burgundy peer-checked:bg-burgundy peer-checked:text-ivory",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                    )}
                  >
                    {event.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {truncated && <p className="text-body-sm text-destructive">{UPLOAD.tooMany}</p>}
        {queue.rateLimited && <FormAlert title={UPLOAD.rateLimited} />}

        <UploadQueueList
          items={queue.items}
          running={queue.running}
          onRemove={queue.remove}
          onRetry={(id) => void queue.retry(id, eventId)}
        />

        <button
          type="button"
          disabled={queue.running || queue.counts.waiting === 0}
          aria-busy={queue.running || undefined}
          onClick={() => void upload()}
          className={cn(primaryButton, "h-12 w-full")}
        >
          <Upload aria-hidden className="size-4" />
          {queue.running ? UPLOAD.uploading : GUEST_GALLERY.sheet.start(queue.counts.waiting)}
        </button>
      </div>
    </Dialog>
  );
}

/** A switched-off, withdrawn or unknown link: nothing about the wedding is shown. */
export function GalleryClosed() {
  return (
    <section className="mt-10 rounded-3xl border border-sand bg-white px-6 py-10 text-center shadow-sm">
      <Lock aria-hidden className="mx-auto size-9 text-gold-deep" />
      <h1 className="mt-4 font-serif text-headline-sm text-graphite">
        {GUEST_GALLERY.closed.title}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-body-md text-plum">
        {GUEST_GALLERY.closed.description}
      </p>
    </section>
  );
}

/** The gallery couldn't be loaded just now (or too many visits from one place). */
export function GalleryUnavailable() {
  return (
    <section className="mt-10 rounded-3xl border border-sand bg-white px-6 py-10 text-center shadow-sm">
      <Camera aria-hidden className="mx-auto size-9 text-gold-deep" />
      <h1 className="mt-4 font-serif text-headline-sm text-graphite">
        {GUEST_GALLERY.unavailable.title}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-body-md text-plum">
        {GUEST_GALLERY.unavailable.description}
      </p>
      {/* A plain reload of the same address. */}
      <a href="" className={`${secondaryButton} mt-6`}>
        {GUEST_GALLERY.unavailable.retry}
      </a>
    </section>
  );
}
