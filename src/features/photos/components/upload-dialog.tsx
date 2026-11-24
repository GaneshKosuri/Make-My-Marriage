"use client";

import { ImagePlus, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { primaryButton, secondaryButton } from "@/components/ui/button-styles";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-controls";
import { SelectField } from "@/components/ui/select-field";
import { cn } from "@/lib/cn";
import type { PhotoDto } from "@/modules/photos/photo.types";

import { MEMBER_UPLOAD_ENDPOINTS } from "../api";
import { GALLERY, MEMORIES_ALBUM, UPLOAD } from "../gallery-content";
import { PHOTO_ACCEPT } from "../upload";
import { useUploadQueue } from "../use-upload-queue";
import { UploadQueueList } from "./upload-queue-list";

export interface AlbumChoice {
  id: string;
  name: string;
}

/**
 * Upload photos (PRD §9.20–9.21): choose or drop up to 20 photos, pick the
 * album, and watch each one upload in turn. Failed photos can be tried again.
 */
export function UploadDialog({
  open,
  onClose,
  albums,
  defaultAlbum,
  onUploaded,
}: Readonly<{
  open: boolean;
  onClose: (uploaded: number) => void;
  /** Active events; Wedding Memories is always offered. */
  albums: readonly AlbumChoice[];
  /** The album being viewed: an event id, "other" or undefined (All). */
  defaultAlbum: string | undefined;
  onUploaded: (photo: PhotoDto) => void;
}>) {
  const queue = useUploadQueue(MEMBER_UPLOAD_ENDPOINTS, { onUploaded });
  const [album, setAlbum] = useState<string>(defaultAlbum ?? MEMORIES_ALBUM);
  const [truncated, setTruncated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const eventId = album === MEMORIES_ALBUM ? null : album;

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setTruncated(queue.add([...files]));
  };

  const close = () => {
    if (queue.running) return;
    const uploaded = queue.counts.done;
    queue.clear();
    setTruncated(false);
    onClose(uploaded);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!queue.running) addFiles(event.dataTransfer.files);
  };

  return (
    <Dialog open={open} onClose={close} title={UPLOAD.title}>
      <div className="flex flex-col gap-5">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-sand bg-ivory px-4 py-6 text-center",
            dragging && "border-burgundy bg-sand/50",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-gold-deep shadow-sm">
            <ImagePlus aria-hidden className="size-6" />
          </span>
          <p className="text-body-md text-graphite">
            <span className="hidden md:inline">{UPLOAD.drop}</span>
            <span className="md:hidden">{UPLOAD.dropPhone}</span>
          </p>
          <input
            ref={inputRef}
            id={inputId}
            aria-label={UPLOAD.choose}
            type="file"
            multiple
            accept={PHOTO_ACCEPT}
            className="sr-only"
            disabled={queue.running}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={queue.running}
            onClick={() => inputRef.current?.click()}
            className={secondaryButton}
          >
            {UPLOAD.choose}
          </button>
          <p className="text-body-sm text-plum">{UPLOAD.hint}</p>
        </div>

        <SelectField
          label={UPLOAD.album}
          value={album}
          onChange={(value) => setAlbum(value || MEMORIES_ALBUM)}
          isDisabled={queue.running}
          options={[
            ...albums.map((choice) => ({ value: choice.id, label: choice.name })),
            { value: MEMORIES_ALBUM, label: GALLERY.albums.memories },
          ]}
        />

        {truncated && <p className="text-body-sm text-destructive">{UPLOAD.tooMany}</p>}
        {queue.rateLimited && <FormAlert title={UPLOAD.rateLimited} />}

        <UploadQueueList
          items={queue.items}
          running={queue.running}
          onRemove={queue.remove}
          onRetry={(id) => void queue.retry(id, eventId)}
        />

        <div className="sticky bottom-0 -mx-4 grid grid-cols-2 gap-2 border-t border-sand bg-ivory px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:mx-0 md:flex md:justify-end md:border-0 md:px-0 md:pt-1 md:pb-0">
          <button
            type="button"
            onClick={close}
            disabled={queue.running}
            className={secondaryButton}
          >
            {UPLOAD.close}
          </button>
          <button
            type="button"
            disabled={queue.running || queue.counts.waiting === 0}
            aria-busy={queue.running || undefined}
            onClick={() => void queue.start(eventId)}
            className={primaryButton}
          >
            <Upload aria-hidden className="size-4" />
            {queue.running ? UPLOAD.uploading : UPLOAD.start(queue.counts.waiting || 0)}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
