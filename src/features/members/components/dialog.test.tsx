// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DateField } from "@/components/ui/date-time-fields";

import { Dialog } from "./dialog";

afterEach(cleanup);

function renderDialog(onClose = vi.fn()) {
  render(
    <>
      <button type="button">Opener</button>
      <Dialog open onClose={onClose} title="Remove Rahul?">
        <button type="button">Cancel</button>
        <button type="button">Remove</button>
      </Dialog>
    </>,
  );
  return onClose;
}

const tab = (shiftKey = false) => fireEvent.keyDown(window, { key: "Tab", shiftKey });

describe("<Dialog />", () => {
  it("focuses itself and keeps Tab inside", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Remove Rahul?" });
    expect(dialog).toHaveFocus();

    screen.getByRole("button", { name: "Remove" }).focus();
    tab();
    // The first control is the Close button in the header.
    expect(screen.getAllByRole("button", { name: "Close" }).at(-1)).toHaveFocus();

    tab(true);
    expect(screen.getByRole("button", { name: "Remove" })).toHaveFocus();
  });

  it("pulls focus back in from outside", () => {
    renderDialog();
    screen.getByRole("button", { name: "Opener" }).focus();
    tab(true);
    expect(screen.getByRole("button", { name: "Remove" })).toHaveFocus();
  });

  it("closes on Escape", () => {
    const onClose = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("lets a calendar popover inside keep Tab to itself (review D2)", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onClose={vi.fn()} title="Add event">
        <DateField label="Date" value="2027-02-14" onChange={vi.fn()} today="2026-11-11" />
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: /Open calendar/ }));
    const calendar = await screen.findByRole("grid");
    const popover = calendar.closest("[data-trigger]")!;
    await waitFor(() => expect(popover.contains(document.activeElement)).toBe(true));

    await user.tab();
    expect(popover.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(popover.contains(document.activeElement)).toBe(true);
  });
});
