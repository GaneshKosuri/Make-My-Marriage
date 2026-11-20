"use client";

import {
  Camera,
  CheckCircle2,
  Download,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  dangerButton,
  focusRing,
  primaryButton,
  secondaryButton,
} from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { useEvents } from "@/features/events/api";
import { cn } from "@/lib/cn";
import type { EventDto } from "@/modules/events/event.types";
import type { PhotoDto } from "@/modules/photos/photo.types";

import {
  useDeletePhoto,
  useDownloadPhoto,
  useInvalidatePhotos,
  usePhotos,
  usePhotoTotal,
} from "../api";
import { GALLERY, GALLERY_ROUTES, MEMORIES_ALBUM, UPLOAD } from "../gallery-content";
import { PhotoGrid, TileAction } from "./photo-grid";
import { PhotoViewer, viewerButton, viewerDangerButton } from "./photo-viewer";
import { UploadDialog } from "./upload-dialog";

const ALBUM_PARAM = "album";
/** "?new=1" (the "+" sheet's "Upload photos") opens the upload dialog. */
const UPLOAD_PARAM = "new";

/** Active events in date order: the albums photos can be added to. */
function activeAlbums(events: readonly EventDto[]) {
  return events
    .filter((event) => !event.archivedAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((event) => ({ id: event.id, name: event.name }));
}

/** The album in the address: an event id, "other", or undefined for All. */
function readAlbum(params: URLSearchParams): string | undefined {
  const value = params.get(ALBUM_PARAM)?.trim();
  return value && (value === MEMORIES_ALBUM || /^[0-9a-f]{24}$/i.test(value)) ? value : undefined;
}

/**
 * /app/photos (PRD §9.20–9.21; API_DESIGN §75–78): the wedding's private
 * gallery by album, with uploads, the viewer, downloads and deletes. The album
 * is kept in the address so Back and reloads return to it.
 */
export function GalleryScreen({ timeZone }: Readonly<{ timeZone: string }>) {
  const searchParams = useSearchParams();
  const [album, setAlbum] = useState<string | undefined>(() => readAlbum(searchParams));
  const events = useEvents(true);
  const photos = usePhotos(album);
  const total = usePhotoTotal();
  const invalidate = useInvalidatePhotos();
  const remove = useDeletePhoto();
  const download = useDownloadPhoto();

  const startUpload = searchParams.get(UPLOAD_PARAM) === "1";
  const [uploading, setUploading] = useState(startUpload);
  // The "+" sheet's link can arrive while the screen stays mounted.
  const [lastSearch, setLastSearch] = useState(searchParams.toString());
  if (searchParams.toString() !== lastSearch) {
    setLastSearch(searchParams.toString());
    if (startUpload) setUploading(true);
  }
  // Then drop ?new=1, so a reload or Back doesn't open the dialog again.
  useEffect(() => {
    if (!startUpload) return;
    const params = new URLSearchParams(window.location.search);
    params.delete(UPLOAD_PARAM);
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      rest ? `${GALLERY_ROUTES.gallery}?${rest}` : GALLERY_ROUTES.gallery,
    );
  }, [startUpload]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<PhotoDto | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loaded = photos.data?.pages.flatMap((page) => page.data) ?? [];
  const albumTotal = photos.data?.pages[0]?.pagination.total ?? 0;
  const albums = activeAlbums(events.data ?? []);
  const eventNames = new Map((events.data ?? []).map((event) => [event.id, event]));

  const albumOf = (photo: PhotoDto) => {
    const event = photo.eventId ? eventNames.get(photo.eventId) : undefined;
    if (!event) return GALLERY.albums.memories;
    return GALLERY.albumName(event.name, Boolean(event.archivedAt));
  };

  const show = (next: string | undefined) => {
    setAlbum(next);
    setViewing(null);
    setNotice(null);
    const url = next ? `${GALLERY_ROUTES.gallery}?${ALBUM_PARAM}=${next}` : GALLERY_ROUTES.gallery;
    window.history.replaceState(null, "", url);
  };

  // Near the end of what's loaded, the viewer brings in the next page.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = photos;
  useEffect(() => {
    if (viewing !== null && viewing >= loaded.length - 2 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [viewing, loaded.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const photoActions = (photo: PhotoDto, inViewer: boolean) => {
    const name = GALLERY.photoName(photo.originalFilename);
    if (inViewer) {
      return (
        <>
          <button
            type="button"
            disabled={download.isPending}
            onClick={() => download.mutate(photo.id)}
            className={viewerButton}
          >
            <Download aria-hidden className="size-4" />
            {GALLERY.download}
          </button>
          <button type="button" onClick={() => setDeleting(photo)} className={viewerDangerButton}>
            <Trash2 aria-hidden className="size-4" />
            {GALLERY.delete}
          </button>
        </>
      );
    }
    return (
      <>
        <TileAction label={GALLERY.downloadLabel(name)} onClick={() => download.mutate(photo.id)}>
          <Download aria-hidden className="size-4" />
        </TileAction>
        <TileAction label={GALLERY.deleteLabel(name)} danger onClick={() => setDeleting(photo)}>
          <Trash2 aria-hidden className="size-4" />
        </TileAction>
      </>
    );
  };

  const currentAlbumName = (() => {
    if (album === undefined) return null;
    if (album === MEMORIES_ALBUM) return GALLERY.albums.memories;
    return eventNames.get(album)?.name ?? null;
  })();

  let body;
  if (photos.data) {
    if (loaded.length === 0) {
      body =
        album === undefined ? (
          <EmptyState
            title={GALLERY.empty.title}
            description={GALLERY.empty.description}
            onUpload={() => setUploading(true)}
          />
        ) : (
          <EmptyState
            title={GALLERY.emptyAlbum(currentAlbumName ?? GALLERY.albums.memories)}
            description={GALLERY.emptyAlbumDescription}
            onUpload={() => setUploading(true)}
          />
        );
    } else {
      body = (
        <section aria-label={GALLERY.title} className="flex flex-col gap-4">
          <PhotoGrid
            photos={loaded}
            onOpen={setViewing}
            actions={(photo) => photoActions(photo, false)}
          />
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-body-md text-plum">{GALLERY.shown(loaded.length, albumTotal)}</p>
            {hasNextPage && (
              <button
                type="button"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
                className={secondaryButton}
              >
                {isFetchingNextPage ? GALLERY.loadingMore : GALLERY.loadMore}
              </button>
            )}
          </div>
        </section>
      );
    }
  } else if (photos.isError) {
    body = (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-destructive/20 bg-white p-5"
      >
        <p className="text-body-md text-destructive">{GALLERY.loadError.title}</p>
        <button type="button" onClick={() => void photos.refetch()} className={secondaryButton}>
          <RefreshCw aria-hidden className={cn("size-4", photos.isFetching && "animate-spin")} />
          {GALLERY.loadError.retry}
        </button>
      </div>
    );
  } else {
    body = (
      <div
        aria-busy="true"
        aria-label="Loading"
        className="grid grid-cols-3 gap-1 sm:gap-2 md:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-sand sm:rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-deep uppercase">{GALLERY.eyebrow}</p>
          <h1 className="mt-1 font-serif text-headline-md text-graphite md:text-headline-lg">
            {GALLERY.title}
          </h1>
          <p className="mt-1 text-body-md text-plum">{GALLERY.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={GALLERY_ROUTES.qr} className={secondaryButton}>
            <QrCode aria-hidden className="size-4" />
            {GALLERY.qr}
          </Link>
          <button type="button" onClick={() => setUploading(true)} className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            {GALLERY.upload}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-burgundy to-burgundy-deep p-5 text-ivory shadow-md md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-gold-light">
            <Camera aria-hidden className="size-5" />
          </span>
          <p className="font-serif text-title-lg">
            {total.data === undefined ? "…" : GALLERY.banner.photos(total.data)}
          </p>
        </div>
        <Link
          href={GALLERY_ROUTES.qr}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border border-gold-light px-5 text-label-md text-ivory hover:bg-white/10",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-light",
          )}
        >
          <Share2 aria-hidden className="size-4" />
          {GALLERY.banner.share}
        </Link>
      </div>

      <nav aria-label={GALLERY.albums.label} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-2 pb-1">
          <AlbumChip
            label={GALLERY.albums.all}
            active={album === undefined}
            onClick={() => show(undefined)}
          />
          {albums.map((choice) => (
            <AlbumChip
              key={choice.id}
              label={choice.name}
              active={album === choice.id}
              onClick={() => show(choice.id)}
            />
          ))}
          <AlbumChip
            label={GALLERY.albums.memories}
            active={album === MEMORIES_ALBUM}
            onClick={() => show(MEMORIES_ALBUM)}
          />
        </ul>
      </nav>

      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-sand bg-white p-4 text-body-md text-graphite"
        >
          <CheckCircle2 aria-hidden className="size-5 shrink-0 text-gold-deep" />
          {notice}
        </p>
      )}
      {download.isError && (
        <p role="alert" className="text-body-md text-destructive">
          {GALLERY.downloadError}
        </p>
      )}

      {body}

      {uploading && (
        <UploadDialog
          open
          albums={albums}
          defaultAlbum={album}
          onUploaded={() => undefined}
          onClose={(uploaded) => {
            setUploading(false);
            if (uploaded > 0) {
              setNotice(UPLOAD.done(uploaded));
              void invalidate();
            }
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
          timeZone={timeZone}
          actions={(photo) => photoActions(photo, true)}
        />
      )}

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={GALLERY.confirmDelete.title}
        description={GALLERY.confirmDelete.description}
      >
        {remove.isError && (
          <p role="alert" className="mb-4 text-body-md text-destructive">
            {GALLERY.confirmDelete.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <button type="button" onClick={() => setDeleting(null)} className={secondaryButton}>
            {GALLERY.confirmDelete.cancel}
          </button>
          <button
            type="button"
            disabled={remove.isPending}
            aria-busy={remove.isPending || undefined}
            onClick={() => {
              if (!deleting) return;
              remove.mutate(deleting.id, {
                onSuccess: () => {
                  setDeleting(null);
                  setViewing(null);
                  setNotice(GALLERY.deleted);
                },
              });
            }}
            className={dangerButton}
          >
            {GALLERY.confirmDelete.confirm}
          </button>
        </div>
      </Dialog>
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
          "inline-flex h-10 items-center rounded-full border px-4 text-label-md",
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

function EmptyState({
  title,
  description,
  onUpload,
}: Readonly<{ title: string; description: string; onUpload: () => void }>) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-sand bg-white/60 px-6 py-12 text-center">
      <Camera aria-hidden className="size-9 text-gold-deep" />
      <p className="font-serif text-title-lg text-graphite">{title}</p>
      <p className="max-w-md text-body-md text-plum">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onUpload} className={primaryButton}>
          <Plus aria-hidden className="size-4" />
          {GALLERY.upload}
        </button>
        <Link href={GALLERY_ROUTES.qr} className={secondaryButton}>
          <Share2 aria-hidden className="size-4" />
          {GALLERY.banner.share}
        </Link>
      </div>
    </div>
  );
}
