import { describe, expect, it } from "vitest";

import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expense.schemas";

const base = {
  title: "Photographer advance",
  amountPaise: 5_000_000,
  expenseDate: "2026-09-01",
  category: "PHOTOGRAPHY",
};

describe("createExpenseSchema", () => {
  it("defaults the currency to INR and leaves event and vendor out", () => {
    expect(createExpenseSchema.parse(base)).toEqual({ ...base, currency: "INR" });
  });

  it.each([
    { amountPaise: 0 },
    { amountPaise: 99.5 },
    { amountPaise: 100_000_000_001 },
    { expenseDate: "2026-13-01" },
    { expenseDate: "2026-9-1" },
    { category: "MISCELLANEOUS" },
    { eventId: "not-an-id" },
  ])("refuses %o", (change) => {
    expect(createExpenseSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  it("needs a field besides the version, and takes null to unlink", () => {
    expect(updateExpenseSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(updateExpenseSchema.parse({ vendorId: null, version: 1 })).toEqual({
      vendorId: null,
      version: 1,
    });
  });
});

describe("listExpensesQuerySchema", () => {
  it("takes a date range with both ends included, and refuses one that runs backwards", () => {
    expect(
      listExpensesQuerySchema.safeParse({ from: "2026-09-01", to: "2026-09-01" }).success,
    ).toBe(true);
    const backwards = listExpensesQuerySchema.safeParse({ from: "2026-09-02", to: "2026-09-01" });
    expect(backwards.success).toBe(false);
    expect(backwards.error?.issues[0]?.path).toEqual(["to"]);
  });
});
