"use client";

import { useMemo } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { SelectField } from "@/features/auth/components/form-controls";

import { CREATE_WEDDING, TIME_ZONE_LABELS, timeZoneLabel } from "../create-wedding-content";

/** The wedding's IANA time zone: common zones first, then every other zone. */
export function TimeZoneSelect({
  error,
  registration,
}: Readonly<{ error?: string; registration: UseFormRegisterReturn }>) {
  const zones = useMemo(() => {
    const common = Object.keys(TIME_ZONE_LABELS);
    const all = Intl.supportedValuesOf("timeZone").filter(
      // Chrome lists India under its legacy id; offer only the canonical one.
      (zone) => !common.includes(zone) && zone !== "Asia/Calcutta",
    );
    return [...common, ...all];
  }, []);
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
