"use client";

import { AlertCircle, CheckCircle2, RotateCcw, X } from "lucide-react";

import { focusRing } from "@/components/ui/button-styles";
import { cn } from "@/lib/cn";

import { UPLOAD } from "../gallery-content";
import type { UploadItem } from "../use-upload-queue";

const sizeFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });
const megabytes = (bytes: number) => `${sizeFormat.format(bytes / (1024 * 1024))} MB`;

/** A local thumbnail of the chosen file. */
function LocalThumb({ src }: Readonly<{ src: string | null }>) {
  return (
    <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-sand">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}

/**
 * The photos chosen for upload with each one's status: waiting, a progress
 * bar while uploading, uploaded, or why it failed (with "Try again" when a
 * retry can help).
 */
export function UploadQueueList({
  items,
  running,
  onRemove,
  onRetry,
}: Readonly<{
  items: readonly UploadItem[];
  running: boolean;
  onRemove: (id: number) => void;
  onRetry: (id: number) => void;
}>) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={UPLOAD.queue(items.length)}
      className="flex flex-col divide-y divide-sand rounded-2xl border border-sand bg-white"
    >
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 p-3">
          <LocalThumb src={item.thumbUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md text-graphite">{item.file.name}</p>
            <p className="text-body-sm text-plum">{megabytes(item.file.size)}</p>
            {item.status === "failed" && item.problem && (
              <p className="text-body-sm text-destructive">{item.problem}</p>
            )}
            {item.status === "uploading" && (
              <div
                role="progressbar"
                aria-label={`${UPLOAD.status.uploading} ${item.file.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.progress * 100)}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand"
              >
                <div
                  className="h-full rounded-full bg-burgundy transition-[width]"
                  style={{ width: `${Math.max(4, item.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
          <Status item={item} running={running} onRemove={onRemove} onRetry={onRetry} />
        </li>
      ))}
    </ul>
  );
}

function Status({
  item,
  running,
  onRemove,
  onRetry,
}: Readonly<{
  item: UploadItem;
  running: boolean;
  onRemove: (id: number) => void;
  onRetry: (id: number) => void;
}>) {
  const chip = "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-label-sm";
  switch (item.status) {
    case "done":
      return (
        <span className={cn(chip, "bg-gold-light/20 text-gold-deep")}>
          <CheckCircle2 aria-hidden className="size-3.5" />
          {UPLOAD.status.done}
        </span>
      );
    case "uploading":
      return (
        <span className="shrink-0 text-label-sm text-burgundy">
          {Math.round(item.progress * 100)}%
        </span>
      );
    case "failed":
      return (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn(chip, "bg-destructive/10 text-destructive")}>
            <AlertCircle aria-hidden className="size-3.5" />
            {UPLOAD.status.failed}
          </span>
          <div className="flex items-center gap-1">
            {item.retryable && (
              <button
                type="button"
                disabled={running}
                onClick={() => onRetry(item.id)}
                aria-label={UPLOAD.retryLabel(item.file.name)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1 text-label-sm text-burgundy hover:underline disabled:opacity-50",
                  focusRing,
                )}
              >
                <RotateCcw aria-hidden className="size-3.5" />
                {UPLOAD.retry}
              </button>
            )}
            <RemoveButton item={item} disabled={running} onRemove={onRemove} />
          </div>
        </div>
      );
    default:
      return (
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(chip, "bg-sand text-plum")}>{UPLOAD.status.waiting}</span>
          <RemoveButton item={item} disabled={running} onRemove={onRemove} />
        </div>
      );
  }
}

function RemoveButton({
  item,
  disabled,
  onRemove,
}: Readonly<{ item: UploadItem; disabled: boolean; onRemove: (id: number) => void }>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onRemove(item.id)}
      aria-label={UPLOAD.remove(item.file.name)}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-plum hover:bg-sand disabled:opacity-50",
        focusRing,
      )}
    >
      <X aria-hidden className="size-4" />
    </button>
  );
}
