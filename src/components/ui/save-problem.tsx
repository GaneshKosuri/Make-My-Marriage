"use client";

import { RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

import { focusRing } from "./button-styles";
import { FormAlert } from "./form-controls";

/** What a form says when saving fails, in the words of its feature ("this event", "this task"). */
export interface SaveProblemCopy {
  /** Someone saved a newer copy first (409 CONFLICT): reload, then edit again. */
  conflict: { title: string; description: string; action: string };
  /** The record was removed or can't be edited any more (404 NOT_FOUND). */
  gone: { title: string; description: string };
  /** Anything else: network, server. */
  error: { title: string; description: string };
}

/**
 * The banner above an edit form after a failed save. Field errors
 * (VALIDATION_ERROR with details) show next to their fields instead, so
 * there is no banner for them.
 */
export function SaveProblem({
  error,
  onReload,
  copy,
}: Readonly<{ error: unknown; onReload: () => void; copy: SaveProblemCopy }>) {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_ERROR" && error.details) return null;
    if (error.code === "CONFLICT") {
      return (
        <FormAlert title={copy.conflict.title}>
          <p>{copy.conflict.description}</p>
          <button
            type="button"
            onClick={onReload}
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded font-semibold text-burgundy underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            <RefreshCw aria-hidden className="size-4" />
            {copy.conflict.action}
          </button>
        </FormAlert>
      );
    }
    if (error.code === "NOT_FOUND") {
      return <FormAlert title={copy.gone.title}>{copy.gone.description}</FormAlert>;
    }
  }
  return <FormAlert title={copy.error.title}>{copy.error.description}</FormAlert>;
}
