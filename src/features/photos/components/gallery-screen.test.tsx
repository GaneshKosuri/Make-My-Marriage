// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { chooseOption } from "@/components/ui/select-field.test-helpers";
import type { EventDto } from "@/modules/events/event.types";
import type { PhotoDto } from "@/modules/photos/photo.types";

import { GALLERY, UPLOAD } from "../gallery-content";
import { GalleryScreen } from "./gallery-screen";

let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/photos",
  useSearchParams: () => new URLSearchParams(search),
}));

const SANGEET = "6aeb2fe70d805e865a620a01";
const ROKA = "6aeb2fe70d805e865a620a09";

const event = (id: string, name: string, extra: Partial<EventDto> = {}): EventDto => ({
  id,
  name,
  type: null,
  startsAt: "2027-02-12T13:00:00.000Z",
  endsAt: null,
  venueName: null,
  address: null,
  description: null,
  dressCode: null,
  archivedAt: null,
  version: 0,
  ...extra,
});

const photo = (n: number, extra: Partial<PhotoDto> = {}): PhotoDto => ({
  id: `6aeb2fe70d805e865a620b${String(n).padStart(2, "0")}`,
  eventId: SANGEET,
  url: `https://storage.example/photo-${n}.jpg`,
  previewUrl: `https://storage.example/preview-${n}.webp`,
  originalFilename: `IMG_${n}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 2048,
  uploaderType: "MEMBER",
  createdAt: "2027-02-12T15:00:00.000Z",
  ...extra,
});

type Result = { status: number; body: unknown };
let routes: Record<string, (query: URLSearchParams, body: unknown) => Result>;
const calls: { method: string; path: string; query: URLSearchParams; body: unknown }[] = [];
const puts: { url: string; headers: Record<string, string>; size: number }[] = [];

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

/** The browser's direct PUT to storage. */
class FakeXhr {
  status = 0;
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private url = "";
  private headers: Record<string, string> = {};
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: Blob) {
    puts.push({ url: this.url, headers: this.headers, size: body.size });
    setTimeout(() => {
      this.status = 200;
      this.onload?.();
    }, 0);
  }
}

const page = (items: PhotoDto[], nextCursor: string | null = null, total = items.length) => ({
  status: 200,
  body: { data: items, pagination: { nextCursor, total } },
});
const data = (value: unknown) => ({ status: 200, body: { data: value } });
const photoCalls = () =>
  calls.filter((call) => call.method === "GET" && call.path === "/api/photos");

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const tree = () => (
    <QueryClientProvider client={client}>
      <GalleryScreen timeZone="Asia/Kolkata" />
    </QueryClientProvider>
  );
  const result = render(tree());
  /** The same mounted screen after the address changed (a nav link). */
  const navigate = (query: string) => {
    search = query;
    result.rerender(tree());
  };
  return { ...result, navigate };
}

const grid = () => within(screen.getByRole("region", { name: GALLERY.title }));

beforeEach(() => {
  routes = {
    "GET /api/events": () =>
      data([
        event(SANGEET, "Sangeet"),
        event(ROKA, "Roka", { archivedAt: "2026-12-01T00:00:00.000Z" }),
      ]),
    "GET /api/photos": (query) => {
      if (query.get("limit") === "1") return page([photo(1)], "next", 3);
      if (query.get("eventId") === "other") return page([]);
      if (query.get("cursor") === "c2") return page([photo(3, { eventId: ROKA })]);
      return page([photo(1), photo(2, { uploaderType: "GUEST", eventId: null })], "c2", 3);
    },
  };
  calls.length = 0;
  puts.length = 0;
  search = "";
  window.history.replaceState(null, "", "/app/photos");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<GalleryScreen />", () => {
  it("shows previews with guest tags, the total, albums and more on demand", async () => {
    renderScreen();

    const first = await screen.findByRole(
      "button",
      { name: GALLERY.open("IMG_1.jpg") },
      { timeout: 5000 },
    );
    expect(first.querySelector("img")).toHaveAttribute(
      "src",
      "https://storage.example/preview-1.webp",
    );
    expect(grid().getAllByText(GALLERY.guestTag)).toHaveLength(1);
    expect(await screen.findByText("3 photos")).toBeInTheDocument();
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    const albums = within(screen.getByRole("navigation", { name: GALLERY.albums.label }));
    expect(albums.getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "All",
      "Sangeet",
      "Wedding Memories",
    ]);

    fireEvent.click(screen.getByRole("button", { name: GALLERY.loadMore }));
    expect(
      await screen.findByRole("button", { name: GALLERY.open("IMG_3.jpg") }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 of 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: GALLERY.loadMore })).toBeNull();
  });

  it("follows the address while the screen stays mounted (QA G6)", async () => {
    const { navigate } = renderScreen();
    await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 });

    navigate("album=other");
    expect(await screen.findByText("No Wedding Memories photos yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GALLERY.albums.memories })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // The nav link back to /app/photos shows every album again.
    navigate("");
    expect(
      await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: GALLERY.albums.all })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches albums, keeping the album in the address", async () => {
    renderScreen();
    await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: GALLERY.albums.memories }));

    expect(await screen.findByText("No Wedding Memories photos yet")).toBeInTheDocument();
    expect(photoCalls().at(-1)!.query.get("eventId")).toBe("other");
    expect(window.location.search).toBe("?album=other");
    expect(screen.getByRole("button", { name: GALLERY.albums.memories })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("opens the viewer with the original, its album and uploader, and moves between photos", async () => {
    renderScreen();
    fireEvent.click(
      await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 }),
    );

    const viewer = within(screen.getByRole("dialog", { name: GALLERY.viewer.label }));
    expect(viewer.getByRole("img")).toHaveAttribute("src", "https://storage.example/photo-1.jpg");
    expect(viewer.getByText("Sangeet")).toBeInTheDocument();
    expect(viewer.getByText("Uploaded by the family · 12 Feb 2027")).toBeInTheDocument();
    expect(viewer.queryByRole("button", { name: GALLERY.viewer.previous })).toBeNull();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(viewer.getByText(GALLERY.albums.memories)).toBeInTheDocument();
    expect(viewer.getByText("Uploaded by a guest · 12 Feb 2027")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: GALLERY.viewer.label })).toBeNull();
  });

  it("deletes a photo after confirming", async () => {
    let deleted = "";
    routes["DELETE /api/photos/6aeb2fe70d805e865a620b01"] = () => {
      deleted = "yes";
      return data({ success: true });
    };
    renderScreen();
    await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: GALLERY.deleteLabel("IMG_1.jpg") }));
    const confirm = within(screen.getByRole("dialog", { name: GALLERY.confirmDelete.title }));
    fireEvent.click(confirm.getByRole("button", { name: GALLERY.confirmDelete.confirm }));

    expect(await screen.findByText(GALLERY.deleted)).toBeInTheDocument();
    expect(deleted).toBe("yes");
  });

  it("uploads chosen photos one at a time into the chosen album, skipping unsupported files", async () => {
    let confirmed = 0;
    routes["POST /api/photos/upload-url"] = (_query, body) => {
      const { mimeType } = body as { mimeType: string };
      return data({
        uploadUrl: `https://storage.example/put/${confirmed}`,
        objectKey: `staging/weddings/w/gallery/key-${confirmed}.jpg`,
        expiresAt: "2027-02-12T15:10:00.000Z",
        headers: { "Content-Type": mimeType },
        preview: null,
      });
    };
    routes["POST /api/photos"] = () => {
      confirmed += 1;
      return { status: 201, body: { data: photo(10 + confirmed) } };
    };
    renderScreen();
    await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 });

    fireEvent.click(screen.getAllByRole("button", { name: GALLERY.upload })[0]!);
    const dialog = within(screen.getByRole("dialog", { name: UPLOAD.title }));
    const input = dialog.getByLabelText(UPLOAD.choose, { selector: "input" }) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(3000)], "mehendi.jpg", { type: "image/jpeg" }),
          new File([new Uint8Array(500)], "sangeet.png", { type: "image/png" }),
          new File([new Uint8Array(100)], "funny.gif", { type: "image/gif" }),
        ],
      },
    });
    expect(dialog.getByText(UPLOAD.invalid.type)).toBeInTheDocument();
    await chooseOption(UPLOAD.album, "Sangeet");

    fireEvent.click(dialog.getByRole("button", { name: UPLOAD.start(2) }));

    await waitFor(() => expect(dialog.getAllByText(UPLOAD.status.done)).toHaveLength(2));
    const issued = calls.filter((call) => call.path === "/api/photos/upload-url");
    expect(issued.map((call) => call.body)).toEqual([
      { filename: "mehendi.jpg", mimeType: "image/jpeg", sizeBytes: 3000, eventId: SANGEET },
      { filename: "sangeet.png", mimeType: "image/png", sizeBytes: 500, eventId: SANGEET },
    ]);
    expect(puts).toEqual([
      {
        url: "https://storage.example/put/0",
        headers: { "Content-Type": "image/jpeg" },
        size: 3000,
      },
      { url: "https://storage.example/put/1", headers: { "Content-Type": "image/png" }, size: 500 },
    ]);
    expect(
      calls.filter((call) => call.method === "POST" && call.path === "/api/photos")[0]!.body,
    ).toEqual({
      filename: "mehendi.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 3000,
      eventId: SANGEET,
      objectKey: "staging/weddings/w/gallery/key-0.jpg",
    });

    const before = photoCalls().length;
    // The footer's Close (the sheet's corner X has the same name).
    fireEvent.click(dialog.getAllByRole("button", { name: UPLOAD.close }).at(-1)!);
    expect(await screen.findByText(UPLOAD.done(2))).toBeInTheDocument();
    await waitFor(() => expect(photoCalls().length).toBeGreaterThan(before));
  });

  it("marks a photo that failed and uploads it again on Try again", async () => {
    let attempts = 0;
    routes["POST /api/photos/upload-url"] = () =>
      data({
        uploadUrl: "https://storage.example/put",
        objectKey: "staging/weddings/w/gallery/key.jpg",
        expiresAt: "2027-02-12T15:10:00.000Z",
        headers: { "Content-Type": "image/jpeg" },
        preview: null,
      });
    routes["POST /api/photos"] = () => {
      attempts += 1;
      return attempts === 1
        ? { status: 400, body: { error: { code: "UPLOAD_ERROR", message: "x" } } }
        : { status: 201, body: { data: photo(20) } };
    };
    renderScreen();
    await screen.findByRole("button", { name: GALLERY.open("IMG_1.jpg") }, { timeout: 5000 });
    fireEvent.click(screen.getAllByRole("button", { name: GALLERY.upload })[0]!);
    const dialog = within(screen.getByRole("dialog", { name: UPLOAD.title }));
    fireEvent.change(dialog.getByLabelText(UPLOAD.choose, { selector: "input" }), {
      target: { files: [new File([new Uint8Array(10)], "pheras.jpg", { type: "image/jpeg" })] },
    });

    fireEvent.click(dialog.getByRole("button", { name: UPLOAD.start(1) }));
    fireEvent.click(await dialog.findByRole("button", { name: UPLOAD.retryLabel("pheras.jpg") }));

    expect(await dialog.findByText(UPLOAD.status.done)).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
