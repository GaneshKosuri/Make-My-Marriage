// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PhotoDto } from "@/modules/photos/photo.types";

import { PHOTO_URL_REFRESH_MS, useDeletePhoto, usePhotos, usePhotoTotal } from "./api";
import { photosKeys } from "./query-keys";

const photo = (n: number): PhotoDto => ({
  id: `6aeb2fe70d805e865a620b${String(n).padStart(2, "0")}`,
  eventId: null,
  url: `https://storage.example/photo-${n}.jpg`,
  previewUrl: null,
  originalFilename: `IMG_${n}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  uploaderType: "MEMBER",
  createdAt: "2027-02-12T15:00:00.000Z",
});

const gets: string[] = [];
const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const parsed = new URL(url, "http://localhost");
  if ((init.method ?? "GET") === "GET") gets.push(`${parsed.pathname}${parsed.search}`);
  const body =
    init.method === "DELETE"
      ? { data: { success: true } }
      : parsed.searchParams.get("limit") === "1"
        ? { data: [photo(1)], pagination: { nextCursor: "c", total: 2 } }
        : { data: [photo(1), photo(2)], pagination: { nextCursor: null, total: 2 } };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  gets.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("gallery queries (QA G5)", () => {
  it("refresh before the 15-minute photo links run out", async () => {
    const { client, wrapper } = setup();
    renderHook(() => usePhotos(undefined), { wrapper });
    renderHook(() => usePhotoTotal(), { wrapper });

    await waitFor(() => expect(gets).toHaveLength(2));
    for (const query of client.getQueryCache().findAll({ queryKey: photosKeys.all })) {
      expect(query.observers[0]?.options.refetchInterval).toBe(PHOTO_URL_REFRESH_MS);
    }
    expect(PHOTO_URL_REFRESH_MS).toBeLessThan(15 * 60_000);
  });

  it("a delete takes the photo out of the loaded lists without refetching them", async () => {
    const { client, wrapper } = setup();
    const photos = renderHook(() => usePhotos(undefined), { wrapper });
    const total = renderHook(() => usePhotoTotal(), { wrapper });
    await waitFor(() => expect(photos.result.current.data).toBeDefined());
    await waitFor(() => expect(total.result.current.data).toBe(2));
    const before = gets.length;
    const remove = renderHook(() => useDeletePhoto(), { wrapper });

    await act(async () => {
      await remove.result.current.mutateAsync(photo(1).id);
    });

    await waitFor(() =>
      expect(photos.result.current.data!.pages[0]!.data.map((item) => item.id)).toEqual([
        photo(2).id,
      ]),
    );
    const pages = photos.result.current.data!.pages;
    expect(pages[0]!.pagination.total).toBe(1);
    await waitFor(() => expect(total.result.current.data).toBe(1));
    expect(gets).toHaveLength(before);
    expect(client.getQueryState(photosKeys.list({ album: undefined }))?.isInvalidated).toBe(false);
  });
});
