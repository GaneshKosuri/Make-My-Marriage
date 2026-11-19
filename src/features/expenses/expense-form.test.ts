import { describe, expect, it } from "vitest";

import type { ExpenseDto } from "@/modules/expenses/expense.types";

import {
  emptyExpenseForm,
  expenseFormSchema,
  expenseToForm,
  toUpdateExpenseBody,
} from "./expense-form";

const advance: ExpenseDto = {
  id: "6aeb2fe70d805e865a620ac1",
  title: "Photographer advance",
  amountPaise: 5_000_000,
  currency: "INR",
  expenseDate: "2026-09-01",
  category: "PHOTOGRAPHY",
  event: null,
  vendor: {
    id: "6aeb2fe70d805e865a620ab1",
    name: "Pixel",
    category: "PHOTOGRAPHER",
    archivedAt: null,
  },
  notes: null,
  version: 4,
  createdAt: "2026-11-18T00:00:00.000Z",
  updatedAt: "2026-11-18T00:00:00.000Z",
};

const submit = (changes: Partial<ReturnType<typeof expenseToForm>>) => {
  const initial = expenseToForm(advance);
  return toUpdateExpenseBody(expenseFormSchema.parse({ ...initial, ...changes }), initial, 4);
};

describe("expense form", () => {
  it("starts a new expense on today, with a vendor's category when one is chosen", () => {
    expect(emptyExpenseForm("2026-11-18")).toMatchObject({
      expenseDate: "2026-11-18",
      category: "",
    });
    expect(
      emptyExpenseForm("2026-11-18", { id: "6aeb2fe70d805e865a620ab2", category: "CATERER" }),
    ).toMatchObject({ category: "CATERING", vendorId: "6aeb2fe70d805e865a620ab2" });
  });

  it("sends nothing when nothing changed, even if the amount is retyped the same", () => {
    expect(submit({})).toBeNull();
    expect(submit({ amount: "50000.00" })).toBeNull();
  });

  it("unlinks the vendor with null, with the version", () => {
    expect(submit({ vendorId: "" })).toEqual({ vendorId: null, version: 4 });
  });
});
