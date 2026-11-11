// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TitleField } from "./form-controls";

afterEach(cleanup);

function renderTitle(onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault())) {
  render(
    <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
      <TitleField label="Task" name="title" defaultValue="" />
    </form>,
  );
  return { field: screen.getByRole("textbox", { name: "Task" }), onSubmit };
}

describe("TitleField (QA M20)", () => {
  it("is a one-row textarea, so a long title wraps instead of scrolling sideways", () => {
    const { field } = renderTitle();
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "1");
  });

  it("submits the form on Enter instead of adding a line", async () => {
    const { field, onSubmit } = renderTitle();
    await userEvent.type(field, "Book the mehendi artist{Enter}");
    expect(field).toHaveValue("Book the mehendi artist");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("turns pasted line breaks into single spaces", () => {
    const onChange = vi.fn();
    render(<TitleField label="Event" onChange={onChange} />);
    const field = screen.getByRole("textbox", { name: "Event" });
    fireEvent.change(field, { target: { value: "Grand reception \r\n\n dinner" } });
    expect(field).toHaveValue("Grand reception dinner");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
