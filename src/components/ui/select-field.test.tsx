// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SelectField, type SelectFieldProps } from "./select-field";
import { chooseOption, selectedOption, selectTrigger } from "./select-field.test-helpers";

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Done" },
];

function Harness({
  initial = "",
  onChange,
  ...props
}: Partial<SelectFieldProps> & { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <SelectField
      label="Status"
      options={STATUSES}
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

afterEach(cleanup);

describe("<SelectField />", () => {
  it("shows the chosen option and picks another from the list", async () => {
    const onChange = vi.fn();
    render(<Harness initial="TODO" onChange={onChange} />);
    expect(selectedOption("Status")).toBe("To do");

    await chooseOption("Status", "Done");

    expect(onChange).toHaveBeenCalledWith("COMPLETED");
    expect(selectedOption("Status")).toBe("Done");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("offers an empty choice ('Any status') and reports it as ''", async () => {
    const onChange = vi.fn();
    render(<Harness initial="TODO" onChange={onChange} />);

    await chooseOption("Status", "Any status");

    expect(onChange).toHaveBeenCalledWith("");
    expect(selectedOption("Status")).toBe("Any status");
  });

  it("marks the current option and works from the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="TODO" onChange={onChange} />);

    selectTrigger("Status").focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("option", { name: "To do" })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith("IN_PROGRESS");
  });

  it("closes on Escape without changing the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="TODO" onChange={onChange} />);

    await user.click(selectTrigger("Status"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(selectedOption("Status")).toBe("To do");
  });

  it("shows the placeholder when the value matches no option", () => {
    render(<Harness initial="ARCHIVED" placeholder="Choose a status" />);
    expect(selectedOption("Status")).toBe("Choose a status");
  });

  it("explains an error with the field and marks it invalid", () => {
    render(<Harness error="Choose a status" />);
    const trigger = selectTrigger("Status");
    expect(screen.getByText("Choose a status")).toBeInTheDocument();
    expect(trigger.getAttribute("aria-describedby")).toContain(
      screen.getByText("Choose a status").id,
    );
    expect(trigger.closest("[data-select-field]")).toHaveAttribute("data-invalid");
  });

  it("submits the value with the form through its name", async () => {
    render(
      <form aria-label="Task">
        <Harness initial="TODO" name="status" />
      </form>,
    );
    await chooseOption("Status", "Done");
    const form = screen.getByRole("form", { name: "Task" }) as HTMLFormElement;
    expect(new FormData(form).get("status")).toBe("COMPLETED");
  });

  it("searches a long list, grouped in sections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness
        initial="Asia/Kolkata"
        onChange={onChange}
        options={[
          {
            title: "Common",
            options: [
              { value: "Asia/Kolkata", label: "India (IST)" },
              { value: "Asia/Dubai", label: "UAE (GST)" },
            ],
          },
          { title: "All", options: [{ value: "Europe/Paris", label: "Europe/Paris" }] },
        ]}
        search={{ label: "Search time zones", noResults: "No time zones match" }}
      />,
    );

    await user.click(selectTrigger("Status"));
    expect(screen.getByText("Common")).toBeInTheDocument();
    await user.keyboard("par");
    expect(screen.queryByRole("option", { name: "India (IST)" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Europe/Paris" }));
    expect(onChange).toHaveBeenCalledWith("Europe/Paris");

    await user.click(selectTrigger("Status"));
    await user.keyboard("zzz");
    expect(screen.getByText("No time zones match")).toBeInTheDocument();
  });
});
