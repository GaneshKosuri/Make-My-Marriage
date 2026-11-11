/**
 * Test helpers for the date and time fields: type into them the way a person
 * does (one segment after another), and read the plain value they hold.
 */
import { screen, within, type BoundFunctions, type queries } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type Root = BoundFunctions<typeof queries>;

/** The day/month/year (or hour/minute/AM-PM) segments of the field labelled `label`. */
export function fieldSegments(label: string, root: Root = screen): HTMLElement[] {
  return within(root.getAllByRole("group", { name: label })[0]!).getAllByRole("spinbutton");
}

/** Types "YYYY-MM-DD" into a date field (shown day first: DD MM YYYY). */
export async function typeDate(label: string, value: string, root: Root = screen) {
  const [year, month, day] = value.split("-");
  const user = userEvent.setup();
  await user.click(fieldSegments(label, root)[0]!);
  await user.keyboard(`${day}${month}${year}`);
}

/** Types both ends of a date range field, each "YYYY-MM-DD" (shown day first). */
export async function typeDateRange(
  label: string,
  { start, end }: { start: string; end: string },
  root: Root = screen,
) {
  const digits = (value: string) => value.split("-").reverse().join("");
  const user = userEvent.setup();
  await user.click(fieldSegments(label, root)[0]!);
  await user.keyboard(`${digits(start)}${digits(end)}`);
}

/** Types "HH:mm" (24-hour) into a time field (shown on a 12-hour clock). */
export async function typeTime(label: string, value: string, root: Root = screen) {
  const [hours, minutes] = value.split(":").map(Number) as [number, number];
  const hour12 = String(hours % 12 || 12).padStart(2, "0");
  const user = userEvent.setup();
  await user.click(fieldSegments(label, root)[0]!);
  await user.keyboard(`${hour12}${String(minutes).padStart(2, "0")}${hours < 12 ? "a" : "p"}`);
}

/** Empties a date or time field. */
export async function clearField(label: string, root: Root = screen) {
  const user = userEvent.setup();
  for (const segment of fieldSegments(label, root).reverse()) {
    await user.click(segment);
    await user.keyboard("{Backspace}{Backspace}{Backspace}{Backspace}");
  }
}

/** The plain value a field holds ("2027-02-14", "18:30" or ""), read from its form input. */
export function fieldValue(name: string): string {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) throw new Error(`No field named "${name}"`);
  return input.value;
}
