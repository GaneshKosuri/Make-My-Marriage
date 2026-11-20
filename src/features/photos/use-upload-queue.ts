"use client";

import { useRef, useState } from "react";

import { ApiError } from "@/lib/api-client";
import { MAX_PHOTOS_PER_BATCH } from "@/modules/photos/photo.constants";
import type { PhotoDto } from "@/modules/photos/photo.types";

import { fileProblem, uploadPhoto, type UploadEndpoints } from "./upload";

export type UploadStatus = "waiting" | "uploading" | "done" | "failed";

export interface UploadItem {
  id: number;
  file: File;
  status: UploadStatus;
  /** 0–1 while uploading. */
  progress: number;
  /** Why it can't be (or wasn't) uploaded. */
  problem: string | null;
  /** A local link to the chosen file for its thumbnail (nothing is uploaded to show it). */
  thumbUrl: string | null;
}

/** Local object URLs aren't available everywhere (tests); thumbnails are optional. */
const localUrl = (file: File) =>
  typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : null;
const releaseUrl = (url: string | null) => {
  if (url && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
};

/**
 * The files chosen for one batch (at most 20) and their progress. Uploads run
 * one at a time (2026-09-18 notes); a failed photo can be tried again without
 * redoing the others.
 */
export function useUploadQueue(
  endpoints: UploadEndpoints,
  { onUploaded }: { onUploaded?: (photo: PhotoDto) => void } = {},
) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const nextId = useRef(1);

  const update = (id: number, change: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  /** Adds files; returns true when some were left out to keep the batch at 20. */
  const add = (files: readonly File[]): boolean => {
    const room = Math.max(0, MAX_PHOTOS_PER_BATCH - items.length);
    const added = files.slice(0, room).map((file): UploadItem => {
      const problem = fileProblem(file);
      return {
        id: nextId.current++,
        file,
        status: problem ? "failed" : "waiting",
        progress: 0,
        problem,
        thumbUrl: localUrl(file),
      };
    });
    setItems((current) => [...current, ...added]);
    return files.length > room;
  };

  const remove = (id: number) => {
    releaseUrl(items.find((item) => item.id === id)?.thumbUrl ?? null);
    setItems((current) => current.filter((item) => item.id !== id));
  };
  const clear = () => {
    for (const item of items) releaseUrl(item.thumbUrl);
    setItems([]);
    setRateLimited(false);
  };

  /** Uploads every waiting photo in order, into one album. */
  const start = async (eventId: string | null, only?: readonly UploadItem[]) => {
    const queue = (only ?? items).filter((item) => item.status === "waiting");
    if (queue.length === 0) return;
    setRunning(true);
    setRateLimited(false);
    for (const item of queue) {
      update(item.id, { status: "uploading", progress: 0, problem: null });
      try {
        const photo = await uploadPhoto(endpoints, item.file, eventId, (progress) =>
          update(item.id, { progress }),
        );
        update(item.id, { status: "done", progress: 1 });
        onUploaded?.(photo);
      } catch (error) {
        const limited = error instanceof ApiError && error.code === "RATE_LIMITED";
        update(item.id, { status: "failed", problem: null });
        if (limited) {
          // The rest would be refused too: leave them waiting for later.
          setRateLimited(true);
          break;
        }
      }
    }
    setRunning(false);
  };

  /** Tries one failed photo again (only ones that failed while uploading). */
  const retry = async (id: number, eventId: string | null) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.problem) return;
    const again = { ...item, status: "waiting" as const };
    update(id, { status: "waiting" });
    await start(eventId, [again]);
  };

  const counts = {
    waiting: items.filter((item) => item.status === "waiting").length,
    done: items.filter((item) => item.status === "done").length,
  };

  return { items, running, rateLimited, counts, add, remove, clear, start, retry };
}
