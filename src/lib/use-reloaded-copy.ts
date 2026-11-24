"use client";

import { useState } from "react";

/**
 * The copy an edit form works from after "Reload" on a CONFLICT (QA C1).
 *
 * The form dialogs stay mounted while closed, so the reloaded copy must not
 * outlive the edit: it is dropped when the dialog closes, and a newer copy
 * from the server (a higher `version`) always wins over it. `formKey` changes
 * on each reload, so the inner form starts fresh from the reloaded values.
 */
export function useReloadedCopy<T extends { id: string; version: number }>(
  record: T | undefined,
  open: boolean,
) {
  const [reloaded, setReloaded] = useState<{ record: T; count: number } | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setReloaded(null);
  }

  const current =
    reloaded &&
    record &&
    reloaded.record.id === record.id &&
    reloaded.record.version >= record.version
      ? reloaded.record
      : record;
  const usesReloaded = current !== record;

  return {
    current,
    formKey: current ? `${current.id}:${usesReloaded ? (reloaded?.count ?? 0) : 0}` : "new",
    setReloaded: (fresh: T) =>
      setReloaded((last) => ({ record: fresh, count: (last?.count ?? 0) + 1 })),
  };
}
