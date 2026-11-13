/**
 * Test helpers for SelectField: open it and pick an option the way a person
 * does, and read what it shows.
 */
import { screen, type BoundFunctions, type queries } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type Root = BoundFunctions<typeof queries>;

/** The button that opens the dropdown labelled `label`. */
export function selectTrigger(label: string, root: Root = screen): HTMLButtonElement {
  const labels = root.getAllByText(label, { selector: "label, span" });
  for (const element of labels) {
    const button = element
      .closest("[data-select-field]")
      ?.querySelector<HTMLButtonElement>("button");
    if (button) return button;
  }
  throw new Error(`No dropdown labelled "${label}"`);
}

/** Opens the dropdown labelled `label` and picks the option called `option`. */
export async function chooseOption(label: string, option: string, root: Root = screen) {
  const user = userEvent.setup();
  await user.click(selectTrigger(label, root));
  // The list opens in a popover at the end of <body>.
  await user.click(await screen.findByRole("option", { name: option }));
}

/** What the dropdown labelled `label` shows: the chosen option's text, or its placeholder. */
export function selectedOption(label: string, root: Root = screen): string {
  return selectTrigger(label, root).textContent?.trim() ?? "";
}
