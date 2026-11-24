// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GallerySettingsDto } from "@/modules/weddings/wedding.types";

import { SHARE } from "../gallery-content";
import { GalleryShareScreen } from "./gallery-share-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/photos/qr",
  useSearchParams: () => new URLSearchParams(),
}));

const URL_ = "https://makemymarriage.example/gallery/abcDEF123_-token";
let settings: GallerySettingsDto;
const patches: unknown[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  if (url.startsWith("/api/gallery/settings")) {
    if (method === "PATCH") {
      const body = JSON.parse(String(init.body)) as Partial<GallerySettingsDto>;
      patches.push(body);
      settings = { ...settings, ...body };
    }
    return new Response(JSON.stringify({ data: settings }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response("{}", { status: 500 });
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <GalleryShareScreen coupleName="Akshay & Princi" dateLine="14 February 2027 · Dehradun" />
    </QueryClientProvider>,
  );
}

const switchNamed = (name: string) => screen.getByRole("switch", { name: new RegExp(name) });

beforeEach(() => {
  settings = { isEnabled: true, guestUploadsEnabled: true, galleryUrl: URL_, qrUrl: URL_ };
  patches.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<GalleryShareScreen />", () => {
  it("shows the switches, the link, WhatsApp sharing and the QR card", async () => {
    renderScreen();

    expect(
      await screen.findByRole("textbox", { name: SHARE.link.label }, { timeout: 5000 }),
    ).toHaveValue(URL_);
    expect(switchNamed(SHARE.access.gallery.label)).toHaveAttribute("aria-checked", "true");
    expect(switchNamed(SHARE.access.uploads.label)).toHaveAttribute("aria-checked", "true");
    const whatsapp = screen.getByRole("link", { name: SHARE.link.whatsapp });
    expect(decodeURIComponent(whatsapp.getAttribute("href")!)).toBe(
      `https://wa.me/?text=Share the memories 📸\n\nSee and add photos from Akshay & Princi's wedding: ${URL_}`,
    );
    expect(screen.getByText(SHARE.card.scan("Akshay & Princi"))).toBeInTheDocument();
    expect(screen.getByText("14 February 2027 · Dehradun")).toBeInTheDocument();
    const qr = await screen.findByRole("img", { name: SHARE.card.qrLabel("Akshay & Princi") });
    expect(qr.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("turns the gallery off; uploads then can't be changed and the card is covered", async () => {
    renderScreen();
    await screen.findByRole("textbox", { name: SHARE.link.label }, { timeout: 5000 });

    fireEvent.click(switchNamed(SHARE.access.gallery.label));

    await waitFor(() =>
      expect(switchNamed(SHARE.access.gallery.label)).toHaveAttribute("aria-checked", "false"),
    );
    expect(patches).toEqual([{ isEnabled: false }]);
    expect(switchNamed(SHARE.access.uploads.label)).toBeDisabled();
    expect(switchNamed(SHARE.access.uploads.label)).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(SHARE.off.overlay)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SHARE.print })).toBeDisabled();
  });

  it("keeps the SVG link alive until the download has started (QA CL)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const revoked: string[] = [];
    const clickedWhileRevoked: boolean[] = [];
    const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = () => "blob:qr";
    URL.revokeObjectURL = (url: string) => void revoked.push(url);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => void clickedWhileRevoked.push(revoked.length > 0));
    try {
      renderScreen();
      vi.useRealTimers();
      const download = await screen.findByRole(
        "button",
        { name: new RegExp(SHARE.downloadSvg) },
        { timeout: 5000 },
      );
      await waitFor(() => expect(download).toBeEnabled());
      vi.useFakeTimers({ toFake: ["setTimeout"] });
      fireEvent.click(download);
      expect(clickedWhileRevoked).toEqual([false]);
      expect(revoked).toEqual([]);
      vi.runAllTimers();
      expect(revoked).toEqual(["blob:qr"]);
    } finally {
      vi.useRealTimers();
      click.mockRestore();
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
    }
  });

  it("turns guest uploads off on their own", async () => {
    renderScreen();
    await screen.findByRole("textbox", { name: SHARE.link.label }, { timeout: 5000 });

    fireEvent.click(switchNamed(SHARE.access.uploads.label));

    await waitFor(() => expect(patches).toEqual([{ guestUploadsEnabled: false }]));
  });

  it("copies the link", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderScreen();
    await screen.findByRole("textbox", { name: SHARE.link.label }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: SHARE.link.copy }));

    expect(await screen.findByRole("button", { name: SHARE.link.copied })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(URL_);
  });
});
