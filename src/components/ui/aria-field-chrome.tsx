"use client";

/**
 * The label row, message line and popover surface shared by the fields built
 * on React Aria Components (date, time and select fields), so they all read
 * like the app's other inputs.
 */
import { AlertCircle } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { Label, Text } from "react-aria-components";

import { cn } from "@/lib/cn";

/** What a form library may do with a field: focus it (e.g. on a validation error). */
export interface FocusableField {
  focus: () => void;
}

export interface FieldChromeProps {
  label: string;
  /** e.g. React Hook Form's `field.ref`, so `setError(…, { shouldFocus: true })` works. */
  fieldRef?: Ref<FocusableField>;
  /** Right side of the label row, e.g. an "Optional" tag. */
  labelAside?: ReactNode;
  error?: string;
  /** Shown under the field when there is no error. */
  hint?: ReactNode;
}

/** A white card floating over the page: the calendar, time list and option lists. */
export const popoverSurfaceClass = "rounded-2xl border border-sand bg-white shadow-xl outline-none";

export function FieldLabel({
  label,
  labelAside,
  className,
}: Pick<FieldChromeProps, "label" | "labelAside"> & { className?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className={cn("text-label-md text-graphite", className)}>{label}</Label>
      {labelAside}
    </div>
  );
}

/**
 * The error, or else the hint, in React Aria's description slots so screen
 * readers read it with the field (like the app's other fields; not an alert).
 */
export function FieldMessage({ error, hint }: Pick<FieldChromeProps, "error" | "hint">) {
  if (error) {
    return (
      <Text
        slot="errorMessage"
        elementType="p"
        className="flex items-center gap-1.5 text-body-sm text-destructive"
      >
        <AlertCircle aria-hidden className="size-3.5 shrink-0" />
        {error}
      </Text>
    );
  }
  return hint ? (
    <Text slot="description" elementType="div">
      {hint}
    </Text>
  ) : null;
}
