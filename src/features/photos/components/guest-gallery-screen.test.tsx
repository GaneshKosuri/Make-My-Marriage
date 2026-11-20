// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PhotoDto, PublicGalleryDto } from "@/modules/photos/photo.types";

import { GALLERY, GUEST_GALLERY, UPLOAD } from "../gallery-content";
import { GuestGalleryScreen } from "./guest-gallery-screen";

const TOKEN = "abcDEF123_-token";
const HALDI = "6aeb2fe70d805e865a620a02";

const gallery = (extra: Partial<PublicGalleryDto> = {}): PublicGalleryDto => ({
  wedding: {
    brideName: "Princi",
    groomName: "Akshay",
    weddingDate: "2027-02-14",
    timeZone: "Asia/Kolkata",
  },
  guestUploadsEnabled: true,
  events: [{ id: HALDI, name: "Haldi" }],
  ...extra,
});

const photo = (n: number, extra: Partial<PhotoDto> = {}): PhotoDto => ({
  id: `6aeb2fe70d805e865a620b${String(n).padStart(2, "0")}`,
  eventId: HALDI,
  url: `https://storage.example/photo-${n}.jpg`,
  previewUrl: null,
  originalFilename: null,
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  uploaderType: "GUEST",
  createdAt: "2027-02-13T06:00:00.000Z",
  ...extra,
});

type Result = { status: number; body: unknown };
let routes: Record<string, (query: URLSearchParams, body: unknown) => Result>;
const calls: { method: string; path: string; query: URLSearchParams; body: unknown }[] = [];
const BASE = `/api/public/galleries/${TOKEN}`;

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const parsed = new URL(url, "http://localhost");
  const body = init.body ? (JSON.parse(String(init.body)) as unknown) : undefined;
  calls.push({ method, path: parsed.pathname, query: parsed.searchParams, body });
  const handler = routes[`${method} ${parsed.pathname}`];
  const result = handler
    ? handler(parsed.searchParams, body)
    : { status: 500, body: { error: { code: "INTERNAL_ERROR", message: "x" } } };
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
});

class FakeXhr {
  status = 0;
  upload = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  send() {
    setTimeout(() => {
      this.status = 200;
      this.onload?.();
    }, 0);
  }
}

const page = (items: PhotoDto[]) => ({
  status: 200,
  body: { data: items, pagination: { nextCursor: null, total: items.length } },
});

function renderScreen(data = gallery()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GuestGalleryScreen token={TOKEN} gallery={data} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  routes = {
    [`GET ${BASE}/photos`]: (query) =>
      query.get("eventId") === "other" ? page([]) : page([photo(1), photo(2, { eventId: null })]),
  };
  calls.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<GuestGalleryScreen />", () => {
  it("shows the couple, the albums and the photos, with no download or delete", async () => {
    renderScreen();

    expect(screen.getByRole("heading", { name: "Akshay & Princi" })).toBeInTheDocument();
    expect(screen.getByText("14 February 2027")).toBeInTheDocument();
    const albums = within(screen.getByRole("navigation", { name: GUEST_GALLERY.albumsLabel }));
    expect(albums.getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "All",
      "Haldi",
      "Wedding Memories",
    ]);
    fireEvent.click(
      (
        await screen.findAllByRole(
          "button",
          { name: GALLERY.open("Wedding photo") },
          { timeout: 5000 },
        )
      )[0]!,
    );
    const viewer = within(screen.getByRole("dialog", { name: GALLERY.viewer.label }));
    expect(viewer.getByText("Haldi")).toBeInTheDocument();
    expect(viewer.queryByRole("button", { name: GALLERY.download })).toBeNull();
    expect(viewer.queryByRole("button", { name: GALLERY.delete })).toBeNull();
  });

  it("shows an empty album and the uploads-off note", async () => {
    renderScreen(gallery({ guestUploadsEnabled: false }));

    expect(screen.getByText(GUEST_GALLERY.uploadsOff)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(GUEST_GALLERY.add) })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: GALLERY.albums.memories }));
    expect(
      await screen.findByText(GUEST_GALLERY.emptyAlbum("Wedding Memories"), {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("uploads photos to the chosen event and says thank you", async () => {
    routes[`POST ${BASE}/upload-url`] = (_query, body) => ({
      status: 200,
      body: {
        data: {
          uploadUrl: "https://storage.example/put",
          objectKey: `staging/weddings/w/gallery/${(body as { filename: string }).filename}`,
          expiresAt: "2027-02-13T06:10:00.000Z",
          headers: { "Content-Type": "image/jpeg" },
          preview: null,
        },
      },
    });
    routes[`POST ${BASE}/photos`] = () => ({ status: 201, body: { data: photo(9) } });
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: new RegExp(GUEST_GALLERY.add) }));
    const sheet = within(screen.getByRole("dialog", { name: GUEST_GALLERY.sheet.title }));
    fireEvent.change(sheet.getByLabelText(UPLOAD.dropPhone, { selector: "input" }), {
      target: {
        files: [
          new File([new Uint8Array(100)], "haldi-1.jpg", { type: "image/jpeg" }),
          new File([new Uint8Array(200)], "haldi-2.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    fireEvent.click(sheet.getByRole("radio", { name: "Haldi" }));
    fireEvent.click(sheet.getByRole("button", { name: GUEST_GALLERY.sheet.start(2) }));

    const thanks = within(await screen.findByRole("dialog", { name: GUEST_GALLERY.success.title }));
    expect(thanks.getByText(GUEST_GALLERY.success.description(2))).toBeInTheDocument();
    expect(
      calls.filter((call) => call.path === `${BASE}/upload-url`).map((call) => call.body),
    ).toEqual([
      { filename: "haldi-1.jpg", mimeType: "image/jpeg", sizeBytes: 100, eventId: HALDI },
      { filename: "haldi-2.jpg", mimeType: "image/jpeg", sizeBytes: 200, eventId: HALDI },
    ]);

    fireEvent.click(thanks.getByRole("button", { name: GUEST_GALLERY.success.seeGallery }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the closed page when the family switches the gallery off", async () => {
    routes[`GET ${BASE}/photos`] = () => ({
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "x" } },
    });
    renderScreen();

    expect(
      await screen.findByRole("heading", { name: GUEST_GALLERY.closed.title }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Akshay & Princi")).toBeNull();
  });
});
