// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { expensesKeys } from "@/features/expenses/query-keys";
import type { DiscoveredVendorDto } from "@/modules/vendors/vendor.types";

import { useArchiveVendor, useUpdateVendor } from "./api";
import { vendorDiscoveryKeys } from "./query-keys";

const VENDOR = "6aeb2fe70d805e865a620ab1";

const fetchMock = vi.fn(
  async () =>
    new Response(JSON.stringify({ data: { id: VENDOR, name: "Pixel Studio" } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
);

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => vi.unstubAllGlobals());

describe("vendor mutations refresh what shows vendors (QA V2)", () => {
  it("renaming a vendor refreshes expense lists", async () => {
    const { client, wrapper } = setup();
    client.setQueryData(expensesKeys.list({ page: 1 }), { data: [] });
    const update = renderHook(() => useUpdateVendor(), { wrapper });

    await act(async () => {
      await update.result.current.mutateAsync({
        vendorId: VENDOR,
        body: { name: "Pixel Studio", version: 1 },
      });
    });

    expect(client.getQueryState(expensesKeys.list({ page: 1 }))?.isInvalidated).toBe(true);
  });

  it("archiving a vendor marks it in Discover results already on screen", async () => {
    const { client, wrapper } = setup();
    const search = vendorDiscoveryKeys.search({ category: "PHOTOGRAPHER", near: "Dehradun" });
    const found: DiscoveredVendorDto[] = [
      {
        googlePlaceId: "ChIJ-pixel",
        name: "Pixel",
        rating: null,
        ratingCount: null,
        address: null,
        myVendor: { id: VENDOR, archived: false },
      },
    ];
    client.setQueryData(search, found);
    client.setQueryData(expensesKeys.summary(), { totalPaise: 0 });
    const archive = renderHook(() => useArchiveVendor(), { wrapper });

    await act(async () => {
      await archive.result.current.mutateAsync(VENDOR);
    });

    expect(client.getQueryData<DiscoveredVendorDto[]>(search)?.[0]?.myVendor).toEqual({
      id: VENDOR,
      archived: true,
    });
    expect(client.getQueryState(expensesKeys.summary())?.isInvalidated).toBe(true);
  });
});
