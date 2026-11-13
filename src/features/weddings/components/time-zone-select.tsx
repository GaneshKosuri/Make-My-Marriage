"use client";

import { useMemo, type Ref } from "react";

import type { FocusableField } from "@/components/ui/aria-field-chrome";
import { SelectField } from "@/components/ui/select-field";

import { CREATE_WEDDING, TIME_ZONE_LABELS, timeZoneLabel } from "../create-wedding-content";

const COPY = CREATE_WEDDING.fields.timeZone;

/**
 * The wedding's IANA time zone: common zones first, then every other zone,
 * with a search box (there are about 400). `current` is the stored zone; it
 * is always offered, because browsers list some zones under other ids (Chrome
 * has Europe/Kiev, the server Europe/Kyiv) and a missing option would show
 * nothing, and then save nothing.
 */
export function TimeZoneSelect({
  value,
  onChange,
  onBlur,
  name,
  fieldRef,
  error,
  current,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  fieldRef?: Ref<FocusableField>;
  error?: string;
  current?: string;
}>) {
  const sections = useMemo(() => {
    const common = Object.keys(TIME_ZONE_LABELS);
    const others = Intl.supportedValuesOf("timeZone").filter(
      // Chrome lists India under its legacy id; offer only the canonical one.
      (zone) => !common.includes(zone) && zone !== "Asia/Calcutta",
    );
    if (current && !common.includes(current) && !others.includes(current)) others.unshift(current);
    const option = (zone: string) => ({ value: zone, label: timeZoneLabel(zone) });
    return [
      { title: COPY.common, options: common.map(option) },
      { title: COPY.others, options: others.map(option) },
    ];
  }, [current]);
  return (
    <SelectField
      label={COPY.label}
      error={error}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      name={name}
      fieldRef={fieldRef}
      options={sections}
      search={{ label: COPY.search, noResults: COPY.noResults }}
    />
  );
}
