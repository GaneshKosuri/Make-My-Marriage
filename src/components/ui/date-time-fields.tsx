"use client";

/**
 * Date, date-range and time fields in the app's style (decided 2026-11-11),
 * built on React Aria Components for keyboard and screen-reader support.
 *
 * Values stay the plain strings the forms and API already use: dates are
 * calendar days ("2027-02-14") and times are wall-clock times ("18:30"), so
 * nothing is ever shifted through the browser's time zone. Dates are typed or
 * picked in a calendar; times are typed or picked from a list in 15-minute
 * steps. Dates read day-first (en-IN) and times on a 12-hour clock.
 */
import { parseDate, parseTime, Time, type CalendarDate } from "@internationalized/date";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  Button,
  Calendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DatePicker,
  DatePickerStateContext,
  DateRangePicker,
  DateRangePickerStateContext,
  DateSegment,
  Dialog,
  Group,
  Heading,
  I18nProvider,
  ListBox,
  ListBoxItem,
  Popover,
  RangeCalendar,
  TimeField as AriaTimeField,
  type CalendarCellRenderProps,
  type DateSegmentProps,
} from "react-aria-components";

import { cn } from "@/lib/cn";
import { isValidDateOnly, isValidTimeOfDay } from "@/lib/dates";

import {
  FieldLabel,
  FieldMessage,
  popoverSurfaceClass,
  type FieldChromeProps,
  type FocusableField,
} from "./aria-field-chrome";

export type { FocusableField } from "./aria-field-chrome";

const LOCALE = "en-IN";
/** The time list's step, in minutes. */
const TIME_STEP_MINUTES = 15;

// ── Value conversion ─────────────────────────────────────────────────────────

const toCalendarDate = (value: string | undefined): CalendarDate | null =>
  value && isValidDateOnly(value) ? parseDate(value) : null;

const toTime = (value: string | undefined): Time | null =>
  value && isValidTimeOfDay(value) ? parseTime(value) : null;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Keeps the object React Aria last produced while its string form matches the
 * prop, so a value typed one digit at a time (a year: 2, 20, 202, 2027) isn't
 * reset by every round trip through the form; outside changes still come in.
 */
function useFieldValue<T extends { toString(): string }>(
  value: string,
  parse: (value: string) => T | null,
  format: (parsed: T | null) => string,
): [T | null, (next: T | null) => string] {
  const [own, setOwn] = useState<T | null>(() => parse(value));
  const current = format(own) === value ? own : parse(value);
  const accept = (next: T | null) => {
    setOwn(next);
    return format(next);
  };
  return [current, accept];
}

const formatDate = (date: CalendarDate | null) => (date ? date.toString() : "");
const fromTime = (time: Time | null): string =>
  time ? `${pad(time.hour)}:${pad(time.minute)}` : "";

// ── Shared look ──────────────────────────────────────────────────────────────

const groupClass = cn(
  "flex h-12 w-full items-center gap-2 rounded-xl border border-sand bg-white pr-0.5 pl-4 text-body-lg text-graphite shadow-[0_1px_2px_rgba(43,35,38,0.04)] transition-[border-color,box-shadow] sm:text-body-md",
  "data-[focus-within]:border-burgundy data-[focus-within]:ring-[3px] data-[focus-within]:ring-burgundy/10",
  "data-[invalid]:border-destructive data-[invalid]:data-[focus-within]:ring-destructive/10",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
);

const segmentClass = cn(
  "rounded-md px-0.5 tabular-nums outline-none caret-transparent",
  "data-[placeholder]:text-plum/70 data-[type=literal]:px-0 data-[type=literal]:text-plum",
  "focus:bg-burgundy focus:text-ivory data-[placeholder]:focus:text-ivory",
);

// 44 px: the minimum touch target (QA M12); it still fits the 48 px field.
const navButtonClass = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-plum outline-none transition-colors",
  "hover:bg-sand hover:text-burgundy data-[pressed]:bg-sand data-[focus-visible]:ring-2 data-[focus-visible]:ring-burgundy",
  "data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent",
);

/** The calendar / clock button at the end of a field. */
const iconButtonClass = cn("ml-auto", navButtonClass);

// React Aria caps the popover's height to the space on screen; scroll within it
// so a calendar near the bottom of a small phone keeps its last week reachable (QA M10).
const popoverClass = cn("overflow-y-auto overscroll-contain p-3", popoverSurfaceClass);

const footerButtonClass = cn(
  "rounded-full px-3 py-1.5 text-label-md text-burgundy outline-none hover:bg-sand",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-burgundy",
);

/** Lets `ref.focus()` move focus to the field's first segment. */
function useFocusHandle(ref: Ref<FocusableField> | undefined) {
  const groupRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => groupRef.current?.querySelector<HTMLElement>('[role="spinbutton"]')?.focus(),
  }));
  return groupRef;
}

/**
 * One editable part of a date or time. Separators and AM/PM come from the
 * platform's date formatting, which differs between Node and browsers (a narrow
 * no-break space before "pm" on one, a plain space on the other), so the server
 * HTML wouldn't match what the browser renders. Normalised here: plain spaces,
 * and "AM"/"PM" in capitals as the app writes them.
 */
function Segment({ segment }: Pick<DateSegmentProps, "segment">) {
  let text: string | undefined;
  if (segment.type === "literal") text = segment.text.replace(/\s/g, " ");
  if (segment.type === "dayPeriod") text = segment.text.toUpperCase();
  return (
    <DateSegment segment={segment} className={segmentClass}>
      {text}
    </DateSegment>
  );
}

function calendarCellClass(
  {
    isSelected,
    isOutsideMonth,
    isDisabled,
    isUnavailable,
    isToday,
    isFocusVisible,
    isSelectionStart,
    isSelectionEnd,
  }: CalendarCellRenderProps,
  range = false,
) {
  const isEdge = isSelectionStart || isSelectionEnd;
  return cn(
    "flex size-10 cursor-pointer items-center justify-center rounded-full text-body-md text-graphite outline-none transition-colors",
    "hover:bg-sand",
    isToday && !isSelected && "font-bold text-burgundy ring-1 ring-burgundy/40 ring-inset",
    isOutsideMonth && "invisible",
    (isDisabled || isUnavailable) &&
      "cursor-default text-plum/40 line-through hover:bg-transparent",
    isSelected && "bg-burgundy font-semibold text-ivory hover:bg-burgundy-deep",
    isFocusVisible && "ring-2 ring-gold ring-offset-2",
    // Days inside a range read as a soft band between its two ends.
    range &&
      isSelected &&
      !isEdge &&
      "rounded-none bg-sand font-normal text-graphite hover:bg-sand",
  );
}

function CalendarHeader() {
  return (
    <header className="mb-2 flex items-center justify-between gap-2 px-1">
      <Button slot="previous" aria-label="Previous month" className={navButtonClass}>
        <ChevronLeft aria-hidden className="size-5" />
      </Button>
      <Heading className="font-serif text-title-lg text-graphite" />
      <Button slot="next" aria-label="Next month" className={navButtonClass}>
        <ChevronRight aria-hidden className="size-5" />
      </Button>
    </header>
  );
}

function WeekdayHeader() {
  return (
    <CalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="pb-1 text-label-sm font-semibold text-plum uppercase">
          {day}
        </CalendarHeaderCell>
      )}
    </CalendarGridHeader>
  );
}

// ── Single date ─────────────────────────────────────────────────────────────

export interface DateFieldProps extends FieldChromeProps {
  /** "YYYY-MM-DD", or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  /** Earliest / latest allowed day ("YYYY-MM-DD"). */
  min?: string;
  max?: string;
  /** Offer "Clear" in the calendar (optional fields). */
  clearable?: boolean;
  /**
   * Today in the wedding's time zone ("YYYY-MM-DD"), for the "Today" shortcut.
   * Required: the browser's own date can be a day off for someone elsewhere.
   */
  today: string;
  isDisabled?: boolean;
}

/** A calendar day: type it (day, month, year) or pick it in the calendar. */
export function DateField({
  label,
  labelAside,
  error,
  hint,
  value,
  onChange,
  onBlur,
  name,
  min,
  max,
  clearable = false,
  today,
  isDisabled,
  fieldRef,
}: Readonly<DateFieldProps>) {
  const [date, acceptDate] = useFieldValue(value, toCalendarDate, formatDate);
  const groupRef = useFocusHandle(fieldRef);
  return (
    <I18nProvider locale={LOCALE}>
      <DatePicker
        className="flex flex-col gap-2"
        value={date}
        onChange={(next) => onChange(acceptDate(next))}
        onBlur={onBlur}
        name={name}
        minValue={toCalendarDate(min) ?? undefined}
        maxValue={toCalendarDate(max) ?? undefined}
        isInvalid={Boolean(error)}
        // Our forms validate with Zod; never let the browser's own checks interfere.
        validationBehavior="aria"
        isDisabled={isDisabled}
        shouldForceLeadingZeros
      >
        <FieldLabel label={label} labelAside={labelAside} />
        <Group ref={groupRef} className={groupClass}>
          <DateInput className="flex flex-1">
            {(segment) => <Segment segment={segment} />}
          </DateInput>
          <Button aria-label="Open calendar" className={iconButtonClass}>
            <CalendarDays aria-hidden className="size-[18px]" />
          </Button>
        </Group>
        <FieldMessage error={error} hint={hint} />
        <Popover placement="bottom start" offset={8} className={popoverClass}>
          <Dialog className="outline-none">
            <Calendar>
              <CalendarHeader />
              <CalendarGrid className="border-separate border-spacing-y-0.5">
                <WeekdayHeader />
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell date={date} className={(props) => calendarCellClass(props)} />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </Calendar>
            <DateFooter
              clearable={clearable}
              today={today}
              min={min}
              max={max}
              onChange={onChange}
            />
          </Dialog>
        </Popover>
      </DatePicker>
    </I18nProvider>
  );
}

/** "Clear" (optional fields) and "Today" under the calendar. */
function DateFooter({
  clearable,
  today,
  min,
  max,
  onChange,
}: {
  clearable: boolean;
  today: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  const state = useContext(DatePickerStateContext);
  const todayAllowed = (!min || today >= min) && (!max || today <= max);
  if (!clearable && !todayAllowed) return null;
  return (
    <div className="mt-2 flex justify-between border-t border-sand pt-2">
      {clearable ? (
        <Button
          className={footerButtonClass}
          onPress={() => {
            onChange("");
            state?.close();
          }}
        >
          Clear
        </Button>
      ) : (
        <span />
      )}
      {todayAllowed && (
        <Button
          className={footerButtonClass}
          onPress={() => {
            onChange(today);
            state?.close();
          }}
        >
          Today
        </Button>
      )}
    </div>
  );
}

// ── Date range ──────────────────────────────────────────────────────────────

export interface DateRange {
  /** "YYYY-MM-DD", or "" when empty. */
  start: string;
  end: string;
}

interface CalendarRange {
  start: CalendarDate;
  end: CalendarDate;
}

/** "2027-02-10/2027-02-14" for a whole range, "" otherwise (one string, for useFieldValue). */
const rangeKey = ({ start, end }: DateRange) =>
  isValidDateOnly(start) && isValidDateOnly(end) ? `${start}/${end}` : "";
const parseRange = (key: string): CalendarRange | null => {
  const [start, end] = key.split("/").map((part) => toCalendarDate(part));
  return start && end ? { start, end } : null;
};
const formatRange = (range: CalendarRange | null) =>
  range ? `${range.start.toString()}/${range.end.toString()}` : "";
const toDateRange = (key: string): DateRange => {
  const [start = "", end = ""] = key ? key.split("/") : [];
  return { start, end };
};

export interface DateRangeFieldProps extends FieldChromeProps {
  /**
   * A whole range or nothing: a value with only one end set shows as empty, and
   * the field reports a range only once both ends are complete (decided 2026-11-11).
   */
  value: DateRange;
  onChange: (value: DateRange) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  clearable?: boolean;
  isDisabled?: boolean;
}

/** A start and end day: type both, or pick the two ends in the calendar. */
export function DateRangeField({
  label,
  labelAside,
  error,
  hint,
  value,
  onChange,
  onBlur,
  min,
  max,
  clearable = false,
  isDisabled,
  fieldRef,
}: Readonly<DateRangeFieldProps>) {
  const groupRef = useFocusHandle(fieldRef);
  const [range, acceptRange] = useFieldValue(rangeKey(value), parseRange, formatRange);
  return (
    <I18nProvider locale={LOCALE}>
      <DateRangePicker
        className="flex flex-col gap-2"
        value={range}
        onChange={(next) => onChange(toDateRange(acceptRange(next)))}
        onBlur={onBlur}
        minValue={toCalendarDate(min) ?? undefined}
        maxValue={toCalendarDate(max) ?? undefined}
        isInvalid={Boolean(error)}
        // Our forms validate with Zod; never let the browser's own checks interfere.
        validationBehavior="aria"
        isDisabled={isDisabled}
        shouldForceLeadingZeros
      >
        <FieldLabel label={label} labelAside={labelAside} />
        <Group ref={groupRef} className={groupClass}>
          <DateInput slot="start" className="flex">
            {(segment) => <Segment segment={segment} />}
          </DateInput>
          <span aria-hidden className="px-1 text-plum">
            –
          </span>
          <DateInput slot="end" className="flex">
            {(segment) => <Segment segment={segment} />}
          </DateInput>
          <Button aria-label="Open calendar" className={iconButtonClass}>
            <CalendarDays aria-hidden className="size-[18px]" />
          </Button>
        </Group>
        <FieldMessage error={error} hint={hint} />
        <Popover placement="bottom start" offset={8} className={popoverClass}>
          <Dialog className="outline-none">
            <RangeCalendar>
              <CalendarHeader />
              <CalendarGrid className="border-separate border-spacing-y-0.5">
                <WeekdayHeader />
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className={(props) => calendarCellClass(props, true)}
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </RangeCalendar>
            {clearable && <RangeFooter onChange={onChange} />}
          </Dialog>
        </Popover>
      </DateRangePicker>
    </I18nProvider>
  );
}

function RangeFooter({ onChange }: { onChange: (value: DateRange) => void }) {
  const state = useContext(DateRangePickerStateContext);
  return (
    <div className="mt-2 flex border-t border-sand pt-2">
      <Button
        className={footerButtonClass}
        onPress={() => {
          onChange({ start: "", end: "" });
          state?.close();
        }}
      >
        Clear
      </Button>
    </div>
  );
}

// ── Time ────────────────────────────────────────────────────────────────────

/** Every TIME_STEP_MINUTES from midnight: "00:00", "00:15", … "23:45". */
const TIME_OPTIONS = Array.from({ length: (24 * 60) / TIME_STEP_MINUTES }, (_, index) => {
  const minutes = index * TIME_STEP_MINUTES;
  return fromTime(new Time(Math.floor(minutes / 60), minutes % 60));
});

/** "18:30" → "6:30 PM", as the event pages show times. */
export function formatTimeOption(value: string): string {
  const time = parseTime(value);
  const period = time.hour < 12 ? "AM" : "PM";
  const hour = time.hour % 12 || 12;
  return `${hour}:${pad(time.minute)} ${period}`;
}

export interface TimeFieldProps extends FieldChromeProps {
  /** "HH:mm" (24-hour), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  /** Offer "Clear" in the list (optional fields). */
  clearable?: boolean;
  isDisabled?: boolean;
}

/** A wall-clock time: type it (hour, minutes, AM/PM) or pick one from the list. */
export function TimeField({
  label,
  labelAside,
  error,
  hint,
  value,
  onChange,
  onBlur,
  name,
  clearable = false,
  isDisabled,
  fieldRef,
}: Readonly<TimeFieldProps>) {
  const groupRef = useFocusHandle(fieldRef);
  const [open, setOpen] = useState(false);
  const [time, acceptTime] = useFieldValue(value, toTime, fromTime);
  // The list opens at the chosen time, or near the middle of the day.
  const focusKey = useMemo(() => {
    if (value && TIME_OPTIONS.includes(value)) return value;
    const target = value || "18:00";
    return TIME_OPTIONS.find((option) => option >= target) ?? TIME_OPTIONS.at(-1)!;
  }, [value]);

  return (
    <I18nProvider locale={LOCALE}>
      <AriaTimeField
        className="flex flex-col gap-2"
        value={time}
        onChange={(next) => onChange(acceptTime(next))}
        onBlur={onBlur}
        name={name}
        hourCycle={12}
        isInvalid={Boolean(error)}
        // Our forms validate with Zod; never let the browser's own checks interfere.
        validationBehavior="aria"
        isDisabled={isDisabled}
      >
        <FieldLabel label={label} labelAside={labelAside} />
        <Group ref={groupRef} className={groupClass}>
          <DateInput className="flex flex-1">
            {(segment) => <Segment segment={segment} />}
          </DateInput>
          <Button
            aria-label="Choose a time"
            aria-expanded={open}
            className={iconButtonClass}
            onPress={() => setOpen(true)}
            isDisabled={isDisabled}
          >
            <Clock aria-hidden className="size-[18px]" />
          </Button>
        </Group>
        <FieldMessage error={error} hint={hint} />
      </AriaTimeField>
      <Popover
        triggerRef={groupRef}
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom start"
        offset={8}
        className={cn(popoverClass, "w-[var(--trigger-width)] max-w-[240px] p-1.5")}
      >
        {/* A list straight in the popover (no Dialog, which would take focus from it). */}
        <div className="outline-none">
          <TimeList
            current={value}
            focusKey={focusKey}
            onPick={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
          {clearable && value && (
            <div className="mt-1 border-t border-sand pt-1">
              <Button
                className={cn(footerButtonClass, "w-full text-left")}
                onPress={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </Popover>
    </I18nProvider>
  );
}

/**
 * The 15-minute list. It's a list of actions, not a selection: picking any time,
 * including the current one, sets it and closes the list. It opens with focus and
 * scroll on the same option (the current time, or the nearest one after 6 PM).
 */
function TimeList({
  current,
  focusKey,
  onPick,
}: {
  current: string;
  focusKey: string;
  onPick: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // React Aria renders the options in a second pass, and the popover focuses
    // itself on open; so look the option up a frame later, then scroll and focus it.
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const list = listRef.current;
        const option = list?.querySelector<HTMLElement>(`[data-key="${focusKey}"]`);
        if (!list || !option) return;
        // Centre it by setting the list's own scroll: the popover locks page scrolling,
        // which also stops scrollIntoView from moving a list inside it.
        const offset = option.getBoundingClientRect().top - list.getBoundingClientRect().top;
        list.scrollTop += offset - (list.clientHeight - option.offsetHeight) / 2;
        option.focus({ preventScroll: true });
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusKey]);

  return (
    <ListBox
      ref={listRef}
      aria-label="Times"
      onAction={(key) => onPick(String(key))}
      className="max-h-64 overflow-y-auto outline-none"
    >
      {TIME_OPTIONS.map((option) => {
        const isCurrent = option === current;
        return (
          <ListBoxItem
            key={option}
            id={option}
            textValue={formatTimeOption(option)}
            className={({ isFocused }) =>
              cn(
                "cursor-pointer rounded-lg px-3 py-2 text-body-md text-graphite outline-none",
                isFocused && "bg-sand",
                isCurrent && "bg-burgundy font-semibold text-ivory",
                isCurrent && isFocused && "ring-2 ring-gold ring-inset",
              )
            }
          >
            {formatTimeOption(option)}
            {/* Screen readers hear which time is set. */}
            {isCurrent && <span className="sr-only">, current</span>}
          </ListBoxItem>
        );
      })}
    </ListBox>
  );
}
