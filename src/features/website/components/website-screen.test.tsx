// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WebsiteSettingsDto } from "@/modules/weddings/wedding.types";

import { THEME_CHOICES, WEBSITE } from "../website-content";
import { WebsiteScreen } from "./website-screen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/website",
  useSearchParams: () => new URLSearchParams(),
}));

const URL_ = "https://makemymarriage.example/w/akshay-princi-14022027";
let settings: WebsiteSettingsDto;
const calls: { method: string; path: string; body: unknown }[] = [];
const puts: string[] = [];

const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const method = init.method ?? "GET";
  const path = new URL(url, "http://localhost").pathname;
  const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
  calls.push({ method, path, body });
  let data: unknown = settings;
  if (path === "/api/wedding/cover/upload-url") {
    data = {
      uploadUrl: "https://storage.example/put/cover",
      objectKey: "staging/weddings/w/covers/abc.jpg",
      expiresAt: "2027-01-01T00:00:00.000Z",
      headers: { "Content-Type": "image/jpeg" },
    };
  } else if (method === "PATCH" && body) {
    const { coverImageObjectKey, welcomeMessage, ...rest } = body;
    settings = { ...settings, ...rest } as WebsiteSettingsDto;
    if (welcomeMessage !== undefined) settings.welcomeMessage = welcomeMessage as string | null;
    if (coverImageObjectKey !== undefined) {
      settings.coverImageUrl = coverImageObjectKey ? "https://storage.example/cover.jpg" : null;
    }
    data = settings;
  }
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

class FakeXhr {
  status = 0;
  upload = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private url = "";
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  send() {
    puts.push(this.url);
    setTimeout(() => {
      this.status = 200;
      this.onload?.();
    }, 0);
  }
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <WebsiteScreen coupleName="Akshay & Princi" />
    </QueryClientProvider>,
  );
}

const ready = () =>
  screen.findByRole("textbox", { name: WEBSITE.status.address }, { timeout: 5000 });
const patches = () => calls.filter((call) => call.method === "PATCH").map((call) => call.body);

beforeEach(() => {
  settings = {
    slug: "akshay-princi-14022027",
    theme: "CLASSIC",
    isPublished: false,
    welcomeMessage: null,
    showGallery: false,
    url: URL_,
    coverImageUrl: null,
  };
  calls.length = 0;
  puts.length = 0;
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<WebsiteScreen />", () => {
  it("shows the draft address, sharing, the chosen theme and a preview link", async () => {
    renderScreen();

    expect(await ready()).toHaveValue(URL_);
    expect(screen.getByText(WEBSITE.status.draft)).toBeInTheDocument();
    expect(screen.getByText(WEBSITE.status.draftShareNote)).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: new RegExp(THEME_CHOICES.CLASSIC.name) }),
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: WEBSITE.preview })).toHaveAttribute(
      "href",
      "/app/website/preview?theme=CLASSIC",
    );
    expect(
      decodeURIComponent(
        screen.getByRole("link", { name: WEBSITE.status.whatsapp }).getAttribute("href")!,
      ),
    ).toContain(URL_);
    expect(screen.queryByText(WEBSITE.saveBar.unsaved)).toBeNull();
  });

  it("saves only what changed: theme, welcome message and the gallery button", async () => {
    renderScreen();
    await ready();

    fireEvent.click(screen.getByRole("radio", { name: new RegExp(THEME_CHOICES.MODERN.name) }));
    fireEvent.change(screen.getByRole("textbox", { name: WEBSITE.welcome.label }), {
      target: { value: "  Celebrate with us!  " },
    });
    fireEvent.click(screen.getByRole("switch", { name: new RegExp(WEBSITE.onSite.gallery.label) }));
    expect(screen.getByText(WEBSITE.saveBar.unsaved)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: WEBSITE.preview })).toHaveAttribute(
      "href",
      "/app/website/preview?theme=MODERN",
    );

    fireEvent.click(screen.getByRole("button", { name: WEBSITE.saveBar.save }));

    expect(await screen.findByText(WEBSITE.saveBar.saved)).toBeInTheDocument();
    expect(patches()).toEqual([
      { theme: "MODERN", welcomeMessage: "Celebrate with us!", showGallery: true },
    ]);
    expect(screen.queryByText(WEBSITE.saveBar.unsaved)).toBeNull();
  });

  it("discards unsaved changes", async () => {
    renderScreen();
    await ready();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(THEME_CHOICES.MINIMAL.name) }));

    fireEvent.click(screen.getByRole("button", { name: WEBSITE.saveBar.discard }));

    expect(
      screen.getByRole("radio", { name: new RegExp(THEME_CHOICES.CLASSIC.name) }),
    ).toHaveAttribute("aria-checked", "true");
    expect(patches()).toEqual([]);
  });

  it("publishes after confirming, then offers to unpublish", async () => {
    renderScreen();
    await ready();

    fireEvent.click(screen.getByRole("button", { name: WEBSITE.publish }));
    const dialog = within(screen.getByRole("dialog", { name: WEBSITE.publishDialog.title }));
    fireEvent.click(dialog.getByRole("button", { name: WEBSITE.publishDialog.confirm }));

    expect(await screen.findByText(WEBSITE.publishDialog.done)).toBeInTheDocument();
    expect(patches()).toEqual([{ isPublished: true }]);
    expect(screen.getByText(WEBSITE.status.published)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: WEBSITE.unpublish })).toBeInTheDocument();
  });

  it("uploads a cover photo straight to storage, then saves it", async () => {
    renderScreen();
    await ready();

    fireEvent.change(screen.getByLabelText(WEBSITE.cover.add, { selector: "input" }), {
      target: { files: [new File([new Uint8Array(500)], "us.jpg", { type: "image/jpeg" })] },
    });

    expect(await screen.findByText(WEBSITE.cover.saved)).toBeInTheDocument();
    expect(calls.find((call) => call.path === "/api/wedding/cover/upload-url")?.body).toEqual({
      mimeType: "image/jpeg",
      sizeBytes: 500,
    });
    expect(puts).toEqual(["https://storage.example/put/cover"]);
    expect(patches()).toEqual([{ coverImageObjectKey: "staging/weddings/w/covers/abc.jpg" }]);
    expect(screen.getByRole("img", { name: WEBSITE.cover.alt })).toHaveAttribute(
      "src",
      "https://storage.example/cover.jpg",
    );

    fireEvent.click(screen.getByRole("button", { name: WEBSITE.cover.remove }));
    await waitFor(() => expect(patches().at(-1)).toEqual({ coverImageObjectKey: null }));
    expect(await screen.findByText(WEBSITE.cover.removed)).toBeInTheDocument();
  });

  it("refuses a cover that isn't a JPEG, PNG or WebP without uploading", async () => {
    renderScreen();
    await ready();

    fireEvent.change(screen.getByLabelText(WEBSITE.cover.add, { selector: "input" }), {
      target: { files: [new File([new Uint8Array(10)], "funny.gif", { type: "image/gif" })] },
    });

    expect(await screen.findByText(WEBSITE.cover.invalid)).toBeInTheDocument();
    expect(calls.filter((call) => call.method !== "GET")).toEqual([]);
  });
});
