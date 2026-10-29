// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
});
