"use client";

import { useRef, useState } from "react";

import { MAX_PHOTOS_PER_BATCH } from "@/modules/photos/photo.constants";
import type { PhotoDto } from "@/modules/photos/photo.types";

import {
  fileProblem,
  uploadFailure,
  uploadPhoto,
  type UploadEndpoints,
  type UploadStage,
} from "./upload";

export type UploadStatus = "waiting" | "uploading" | "done" | "failed";

export interface UploadItem {
  id: number;
  file: File;
  status: UploadStatus;
  /** 0–1 while uploading. */
  progress: number;
  /** Why it can't be (or wasn't) uploaded; null for a plain "Couldn't upload". */
  problem: string | null;
  /** "Try again" can help; false for problems a retry won't fix (QA G1). */
  retryable: boolean;
  /** How far the last attempt got, so a retry can resume (QA G2). */
  stage: UploadStage | null;
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
        retryable: false,
        stage: null,
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

  /**
   * Uploads every waiting photo in order, into one album. A photo that already
   * reached storage on an earlier attempt only repeats its confirm.
   */
  const start = async (eventId: string | null, only?: readonly UploadItem[]) => {
    const queue = (only ?? items).filter((item) => item.status === "waiting");
    if (queue.length === 0) return;
    setRunning(true);
    setRateLimited(false);
    for (const item of queue) {
      update(item.id, { status: "uploading", progress: 0, problem: null });
      let stage = item.stage;
      try {
        const photo = await uploadPhoto(endpoints, item.file, eventId, {
          resume: stage,
          onProgress: (progress) => update(item.id, { progress }),
          onStage: (next) => {
            stage = next;
            update(item.id, { stage: next });
          },
        });
        update(item.id, { status: "done", progress: 1, stage: null });
        onUploaded?.(photo);
      } catch (error) {
        const failure = uploadFailure(error);
        update(item.id, {
          status: "failed",
          problem: failure.problem,
          retryable: failure.retryable,
          stage: failure.restart ? null : stage,
        });
        if (failure.rateLimited) {
          // The rest would be refused too: leave them waiting for later.
          setRateLimited(true);
          break;
        }
      }
    }
    setRunning(false);
  };

  /** Tries one failed photo again; it resumes where it stopped when it can. */
  const retry = async (id: number, eventId: string | null) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.status !== "failed" || !item.retryable) return;
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
