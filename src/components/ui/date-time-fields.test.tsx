// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { typeDateRange } from "./date-time-fields.test-helpers";
import {
  DateField,
  DateRangeField,
  formatTimeOption,
  TimeField,
  type DateRange,
} from "./date-time-fields";

afterEach(cleanup);

/** The editable parts (day, month, year / hour, minute, AM-PM) of a field. */
const segmentsOf = (label: string) =>
  within(screen.getAllByRole("group", { name: label })[0]!).getAllByRole("spinbutton");

function ControlledDate(props: { initial?: string; min?: string; clearable?: boolean }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <>
      <DateField
        label="Wedding date"
        value={value}
        onChange={setValue}
        min={props.min}
        clearable={props.clearable}
        today="2026-11-11"
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

function ControlledTime(props: { initial?: string; clearable?: boolean }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <>
      <TimeField label="Starts at" value={value} onChange={setValue} clearable={props.clearable} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const shown = () => screen.getByTestId("value").textContent;

describe("DateField", () => {
  it("shows the day first (en-IN) and keeps the value as YYYY-MM-DD", () => {
    render(<ControlledDate initial="2027-02-14" />);
    expect(segmentsOf("Wedding date").map((segment) => segment.textContent)).toEqual([
      "14",
      "02",
      "2027",
    ]);
  });

  it("takes a typed date", async () => {
    const user = userEvent.setup();
    render(<ControlledDate />);
    await user.click(segmentsOf("Wedding date")[0]!);
    await user.keyboard("13022027");
    expect(shown()).toBe("2027-02-13");
  });

  it("picks a day in the calendar", async () => {
    const user = userEvent.setup();
    render(<ControlledDate initial="2027-02-14" />);
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const calendar = await screen.findByRole("dialog");
    expect(within(calendar).getByRole("heading")).toHaveTextContent("February 2027");
    await user.click(within(calendar).getByRole("button", { name: /20 February 2027/ }));
    expect(shown()).toBe("2027-02-20");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("won't pick a day before `min`, and offers Today and Clear", async () => {
    const user = userEvent.setup();
    render(<ControlledDate initial="2026-11-20" min="2026-11-11" clearable />);
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const calendar = await screen.findByRole("dialog");
    expect(within(calendar).getByRole("button", { name: /10 November 2026/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(within(calendar).getByRole("button", { name: "Today" }));
    expect(shown()).toBe("2026-11-11");

    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Clear" }),
    );
    expect(shown()).toBe("");
  });
});

function ControlledRange({ initial }: { initial: DateRange }) {
  const [value, setValue] = useState<DateRange>(initial);
  return (
    <>
      <DateRangeField label="Wedding week" value={value} onChange={setValue} />
      <output data-testid="value">{`${value.start}|${value.end}`}</output>
    </>
  );
}

describe("DateRangeField", () => {
  it("takes both ends typed, years included (review D4)", async () => {
    render(<ControlledRange initial={{ start: "", end: "" }} />);
    await typeDateRange("Wedding week", { start: "2027-02-10", end: "2027-02-14" });
    expect(shown()).toBe("2027-02-10|2027-02-14");
  });

  it("is a whole range or nothing: a half-filled value shows empty (review D4)", () => {
    render(<ControlledRange initial={{ start: "2027-02-10", end: "" }} />);
    expect(segmentsOf("Wedding week").map((segment) => segment.textContent)).toEqual([
      "dd",
      "mm",
      "yyyy",
      "dd",
      "mm",
      "yyyy",
    ]);
  });

  it("picks a start and an end day", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(range: DateRange) => void>();
    function Range() {
      const [value, setValue] = useState<DateRange>({ start: "2027-02-01", end: "2027-02-02" });
      return (
        <DateRangeField
          label="Wedding week"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Range />);
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const calendar = await screen.findByRole("dialog");
    await user.click(within(calendar).getByRole("button", { name: /10 February 2027/ }));
    await user.click(within(calendar).getByRole("button", { name: /14 February 2027/ }));
    expect(onChange).toHaveBeenLastCalledWith({ start: "2027-02-10", end: "2027-02-14" });
  });
});

describe("TimeField", () => {
  it("shows a 12-hour clock and keeps the value as 24-hour HH:mm", () => {
    render(<ControlledTime initial="18:30" />);
    expect(segmentsOf("Starts at").map((segment) => segment.textContent)).toEqual([
      "6",
      "30",
      // Normalised to capitals, as the app writes times ("6:30 PM").
      "PM",
    ]);
  });

  it("takes a typed time", async () => {
    const user = userEvent.setup();
    render(<ControlledTime />);
    await user.click(segmentsOf("Starts at")[0]!);
    await user.keyboard("0745p");
    expect(shown()).toBe("19:45");
  });

  it("picks a time from the 15-minute list, and clears", async () => {
    const user = userEvent.setup();
    render(<ControlledTime initial="18:00" clearable />);
    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    const list = await screen.findByRole("listbox", { name: "Times" });
    expect(within(list).getAllByRole("option")).toHaveLength(96);
    // The current time is marked for screen readers too.
    expect(within(list).getByRole("option", { name: "6:00 PM, current" })).toBeInTheDocument();
    await user.click(within(list).getByRole("option", { name: "8:15 PM" }));
    expect(shown()).toBe("20:15");

    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Clear" }),
    );
    expect(shown()).toBe("");
  });

  it("closes when the current time is picked again, keeping it (review D3)", async () => {
    const user = userEvent.setup();
    render(<ControlledTime initial="18:00" />);
    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    const list = await screen.findByRole("listbox", { name: "Times" });
    await user.click(within(list).getByRole("option", { name: "6:00 PM, current" }));
    expect(screen.queryByRole("listbox", { name: "Times" })).not.toBeInTheDocument();
    expect(shown()).toBe("18:00");
  });

  it("opens an empty list focused where it is scrolled: 6:00 PM (review D5)", async () => {
    const user = userEvent.setup();
    render(<ControlledTime />);
    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    const list = await screen.findByRole("listbox", { name: "Times" });
    await waitFor(() =>
      expect(within(list).getByRole("option", { name: "6:00 PM" })).toHaveFocus(),
    );
    await user.keyboard("{ArrowDown}{Enter}");
    expect(shown()).toBe("18:15");
  });

  it("formats list times like the event pages", () => {
    expect(formatTimeOption("00:00")).toBe("12:00 AM");
    expect(formatTimeOption("12:15")).toBe("12:15 PM");
    expect(formatTimeOption("23:45")).toBe("11:45 PM");
  });
});
