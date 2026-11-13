"use client";

/**
 * Dropdowns in the app's style (decided 2026-11-13), built on React Aria
 * Components' Select instead of the browser's own `<select>`: the field looks
 * like the other inputs, and its list opens in the same white card as the
 * date picker and time list, on every device.
 *
 * Values stay plain strings, "" included (e.g. "Any event", "Unassigned"), so
 * forms and filters work as they did with `<select>`. Keyboard, type-to-jump
 * and screen-reader support come from React Aria. `searchable` adds a search
 * box above long lists (time zones).
 */
import { Check, ChevronDown, Search } from "lucide-react";
import { useImperativeHandle, useRef, type ReactNode } from "react";
import {
  Autocomplete,
  Button,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  SearchField,
  Select,
  SelectValue,
  useFilter,
  type Key,
} from "react-aria-components";

import { cn } from "@/lib/cn";

import {
  FieldLabel,
  FieldMessage,
  popoverSurfaceClass,
  type FieldChromeProps,
} from "./aria-field-chrome";

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

/** A titled group of options, e.g. "Common time zones". */
export interface SelectOptionSection {
  title: string;
  options: readonly SelectOption[];
}

/** React Aria keys can't be "": the empty choice ("Any event") gets this key instead. */
const EMPTY_KEY = "__empty__";
const toKey = (value: string): Key => (value === "" ? EMPTY_KEY : value);
const fromKey = (key: Key | null): string => (key === null || key === EMPTY_KEY ? "" : String(key));

const isSections = (
  options: readonly SelectOption[] | readonly SelectOptionSection[],
): options is readonly SelectOptionSection[] => options.length > 0 && "options" in options[0]!;

export interface SelectFieldProps extends FieldChromeProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Submitted with the form (a hidden native select carries it). */
  name?: string;
  options: readonly SelectOption[] | readonly SelectOptionSection[];
  /** Shown when the value matches no option. */
  placeholder?: string;
  /** "field" in forms; "filter" is the compact ivory version in filter bars. */
  variant?: "field" | "filter";
  /** A search box above the list, for long lists. */
  search?: { label: string; noResults: string };
  isDisabled?: boolean;
}

const triggerClass = {
  field: cn(
    "h-12 rounded-xl border border-sand bg-white px-4 text-body-lg shadow-[0_1px_2px_rgba(43,35,38,0.04)] sm:text-body-md",
  ),
  // 16 px on phones, like the other filters (iOS zooms in on smaller text).
  filter: "h-11 rounded-xl border border-sand bg-ivory pr-2.5 pl-3 text-[16px] sm:text-body-md",
} as const;

export function SelectField({
  label,
  labelAside,
  error,
  hint,
  value,
  onChange,
  onBlur,
  name,
  options,
  placeholder = "Choose…",
  variant = "field",
  search,
  isDisabled,
  fieldRef,
}: Readonly<SelectFieldProps>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useImperativeHandle(fieldRef, () => ({ focus: () => buttonRef.current?.focus() }));

  return (
    <Select
      className={cn("group flex min-w-0 flex-col", variant === "field" ? "gap-2" : "gap-1")}
      data-select-field={label}
      value={toKey(value)}
      onChange={(key) => onChange(fromKey(key as Key | null))}
      onBlur={onBlur}
      name={name}
      placeholder={placeholder}
      isInvalid={Boolean(error)}
      // Our forms validate with Zod; never let the browser's own checks interfere.
      validationBehavior="aria"
      isDisabled={isDisabled}
    >
      <FieldLabel
        label={label}
        labelAside={labelAside}
        className={variant === "filter" ? "text-label-sm text-plum" : undefined}
      />
      <Button
        ref={buttonRef}
        className={cn(
          "flex w-full min-w-0 cursor-pointer items-center gap-2 text-left text-graphite outline-none",
          "transition-[border-color,box-shadow]",
          triggerClass[variant],
          "data-[focus-visible]:border-burgundy data-[focus-visible]:ring-[3px] data-[focus-visible]:ring-burgundy/10",
          "group-data-[open]:border-burgundy",
          "group-data-[invalid]:border-destructive group-data-[invalid]:data-[focus-visible]:ring-destructive/10",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
        )}
      >
        <SelectValue className="min-w-0 flex-1 truncate data-[placeholder]:text-plum/70" />
        <ChevronDown
          aria-hidden
          className="size-[18px] shrink-0 text-plum transition-transform group-data-[open]:rotate-180"
        />
      </Button>
      <FieldMessage error={error} hint={hint} />
      <Popover
        placement="bottom start"
        offset={6}
        className={cn(
          popoverSurfaceClass,
          // As wide as the field (wider for a narrow filter); the list scrolls inside.
          "flex w-(--trigger-width) min-w-56 flex-col overflow-hidden p-1.5",
        )}
      >
        {search ? (
          <SearchableList options={options} search={search} />
        ) : (
          <OptionList options={options} />
        )}
      </Popover>
    </Select>
  );
}

function SearchableList({
  options,
  search,
}: Readonly<{
  options: SelectFieldProps["options"];
  search: NonNullable<SelectFieldProps["search"]>;
}>) {
  const { contains } = useFilter({ sensitivity: "base" });
  return (
    <Autocomplete filter={contains}>
      <SearchField
        aria-label={search.label}
        autoFocus
        className="mb-1.5 flex h-11 shrink-0 items-center gap-2 rounded-xl border border-sand bg-ivory px-3 data-[focused]:border-burgundy"
      >
        <Search aria-hidden className="size-4 shrink-0 text-plum" />
        <Input
          placeholder={search.label}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-graphite outline-none placeholder:text-plum/70 sm:text-body-md [&::-webkit-search-cancel-button]:hidden"
        />
      </SearchField>
      <OptionList options={options} noResults={search.noResults} />
    </Autocomplete>
  );
}

function OptionList({
  options,
  noResults,
}: Readonly<{ options: SelectFieldProps["options"]; noResults?: string }>) {
  return (
    <ListBox
      className="max-h-80 min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
      renderEmptyState={() => (
        <p className="px-3 py-3 text-body-md text-plum">{noResults ?? "Nothing to choose from"}</p>
      )}
    >
      {isSections(options)
        ? options.map((section) => (
            <ListBoxSection key={section.title} id={section.title} className="not-first:mt-1">
              <Header className="px-3 pt-2 pb-1 text-label-sm font-semibold text-plum uppercase">
                {section.title}
              </Header>
              {section.options.map((option) => (
                <Option key={option.value} option={option} />
              ))}
            </ListBoxSection>
          ))
        : options.map((option) => <Option key={option.value} option={option} />)}
    </ListBox>
  );
}

function Option({ option }: Readonly<{ option: SelectOption }>): ReactNode {
  return (
    <ListBoxItem
      id={toKey(option.value)}
      textValue={option.label}
      isDisabled={option.isDisabled}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-body-md text-graphite outline-none",
        "data-[focused]:bg-ivory data-[pressed]:bg-sand",
        "data-[selected]:font-semibold data-[selected]:text-burgundy",
        "data-[focus-visible]:ring-2 data-[focus-visible]:ring-burgundy data-[focus-visible]:ring-inset",
        "data-[disabled]:cursor-default data-[disabled]:opacity-50",
      )}
    >
      {({ isSelected }) => (
        <>
          <span className="min-w-0 flex-1 wrap-anywhere">{option.label}</span>
          {isSelected && <Check aria-hidden className="size-4 shrink-0 text-burgundy" />}
        </>
      )}
    </ListBoxItem>
  );
}
