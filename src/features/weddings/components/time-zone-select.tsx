"use client";

import { useMemo } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { SelectField } from "@/features/auth/components/form-controls";

import { CREATE_WEDDING, TIME_ZONE_LABELS, timeZoneLabel } from "../create-wedding-content";

/**
 * The wedding's IANA time zone: common zones first, then every other zone.
 * `current` is the stored zone; it is always offered, because browsers list
 * some zones under other ids (Chrome has Europe/Kiev, the server Europe/Kyiv)
 * and a missing option would show, and then save, the first zone instead.
 */
export function TimeZoneSelect({
  error,
  registration,
  current,
}: Readonly<{ error?: string; registration: UseFormRegisterReturn; current?: string }>) {
  const zones = useMemo(() => {
    const common = Object.keys(TIME_ZONE_LABELS);
    const all = Intl.supportedValuesOf("timeZone").filter(
      // Chrome lists India under its legacy id; offer only the canonical one.
      (zone) => !common.includes(zone) && zone !== "Asia/Calcutta",
    );
    const options = [...common, ...all];
    if (current && !options.includes(current)) options.splice(common.length, 0, current);
    return options;
  }, [current]);
  return (
    <SelectField label={CREATE_WEDDING.fields.timeZone.label} error={error} {...registration}>
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {timeZoneLabel(zone)}
        </option>
      ))}
    </SelectField>
  );
}
