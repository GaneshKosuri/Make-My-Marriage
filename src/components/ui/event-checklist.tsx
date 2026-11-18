"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { eventDateTile } from "@/lib/schedule";

import { focusRing } from "./button-styles";

export interface EventChoice {
  id: string;
  name: string;
  startsAt: string;
  archived?: boolean;
}

/** Words for one use of the checklist ("Invited to", "Works at"). */
export interface EventChecklistCopy {
  label: string;
  hint: string;
  all: string;
  none: string;
  noEvents: string;
}

/**
 * Which events a record covers (a guest's invitation, a vendor's bookings):
 * one tick per event with its date, and "Select all" / "Clear all" for the
 * active ones. Archived events a record already has stay listed so they can be
 * unticked.
 */
export function EventChecklist({
  copy,
  choices,
  value,
  onChange,
  timeZone,
  error,
}: Readonly<{
  copy: EventChecklistCopy;
  choices: readonly EventChoice[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  timeZone: string;
  error?: string;
}>) {
  const selected = new Set(value);
  const active = choices.filter((choice) => !choice.archived);
  const toggle = (id: string) =>
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id]);
  const allActiveSelected = active.length > 0 && active.every((choice) => selected.has(choice.id));
  const textButton = cn(
    "tap-target rounded text-label-md text-burgundy underline-offset-4 hover:underline",
    focusRing,
  );

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      {/* The legend names the group for screen readers; the row below shows it with the button. */}
      <legend className="sr-only">{copy.label}</legend>
      <div className="flex min-h-6 items-center justify-between gap-3">
        <span aria-hidden className="text-label-md text-graphite">
          {copy.label}
        </span>
        {active.length > 1 && (
          <button
            type="button"
            onClick={() =>
              onChange(
                allActiveSelected
                  ? value.filter((id) => !active.some((choice) => choice.id === id))
                  : [...new Set([...value, ...active.map((choice) => choice.id)])],
              )
            }
            className={textButton}
          >
            {allActiveSelected ? copy.none : copy.all}
          </button>
        )}
      </div>
      {choices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand bg-white p-4 text-body-sm text-plum">
          {copy.noEvents}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {choices.map((choice) => {
            const tile = eventDateTile(choice.startsAt, timeZone);
            const checked = selected.has(choice.id);
            return (
              <li key={choice.id} className="min-w-0">
                <label className="block cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(choice.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl border border-sand bg-white px-3 py-2 transition-colors hover:bg-ivory",
                      "peer-checked:border-burgundy peer-checked:bg-burgundy/5",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-burgundy",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                        checked ? "border-burgundy bg-burgundy text-ivory" : "border-plum/40",
                      )}
                    >
                      {checked && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-label-md wrap-anywhere text-graphite",
                          choice.archived && "text-plum",
                        )}
                      >
                        {choice.name}
                      </span>
                      <span className="block text-body-sm text-plum">
                        {tile.day} {tile.month} {tile.year}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className={cn("text-body-sm", error ? "text-destructive" : "text-plum")}>
        {error ?? copy.hint}
      </p>
    </fieldset>
  );
}
