// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LivestreamSettingsDto } from "@/modules/weddings/wedding.types";

import { LIVESTREAM } from "../livestream-content";
import { LivestreamScreen } from "./livestream-screen";
import { AppToaster } from "@/components/ui/toaster";

const ID = "dQw4w9WgXcQ";
const WATCH = `https://www.youtube.com/watch?v=${ID}`;
const EMBED = `https://www.youtube-nocookie.com/embed/${ID}?rel=0&modestbranding=1`;

let settings: LivestreamSettingsDto;
const patches: unknown[] = [];

const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
  if (init.method === "PATCH") {
    const body = JSON.parse(String(init.body)) as {
      youtubeUrl?: string | null;
      isEnabled?: boolean;
    };
    patches.push(body);
    if (body.youtubeUrl === null) settings = { youtubeUrl: null, isEnabled: false, embedUrl: null };
    else if (body.youtubeUrl) settings = { ...settings, youtubeUrl: WATCH, embedUrl: EMBED };
    if (body.isEnabled !== undefined) settings = { ...settings, isEnabled: body.isEnabled };
  }
  return new Response(JSON.stringify({ data: settings }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LivestreamScreen />
      <AppToaster />
    </QueryClientProvider>,
  );
}

const linkField = () =>
  screen.findByRole("textbox", { name: LIVESTREAM.link.label }, { timeout: 5000 });
const showSwitch = () => screen.getByRole("switch", { name: new RegExp(LIVESTREAM.show.label) });

beforeEach(() => {
  settings = { youtubeUrl: null, isEnabled: false, embedUrl: null };
  patches.length = 0;
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<LivestreamScreen />", () => {
  it("starts empty: no player, and the switch waits for a link", async () => {
    renderScreen();

    expect(await linkField()).toHaveValue("");
    expect(screen.getByText(LIVESTREAM.empty.title)).toBeInTheDocument();
    expect(showSwitch()).toBeDisabled();
    expect(screen.getByText(LIVESTREAM.show.needsLink)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: LIVESTREAM.remove.action })).toBeNull();
  });

  it("explains a channel link without sending it", async () => {
    renderScreen();
    fireEvent.change(await linkField(), {
      target: { value: "https://www.youtube.com/@akshayprinci/live" },
    });

    fireEvent.click(screen.getByRole("button", { name: LIVESTREAM.link.save }));

    expect(await screen.findByText(LIVESTREAM.link.invalid)).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("saves a link, shows the privacy-enhanced player, then switches it on", async () => {
    renderScreen();
    fireEvent.change(await linkField(), { target: { value: `https://youtu.be/${ID}` } });

    fireEvent.click(screen.getByRole("button", { name: LIVESTREAM.link.save }));

    expect(await screen.findByText(LIVESTREAM.link.saved)).toBeInTheDocument();
    expect(patches).toEqual([{ youtubeUrl: `https://youtu.be/${ID}` }]);
    expect(await linkField()).toHaveValue(WATCH);
    expect(screen.getByTitle(LIVESTREAM.preview.playerTitle)).toHaveAttribute("src", EMBED);

    fireEvent.click(showSwitch());
    await waitFor(() => expect(showSwitch()).toHaveAttribute("aria-checked", "true"));
    expect(patches.at(-1)).toEqual({ isEnabled: true });
  });

  it("keeps a pasted, unsaved link when the switch is toggled (QA W3)", async () => {
    settings = { youtubeUrl: WATCH, isEnabled: false, embedUrl: EMBED };
    renderScreen();
    fireEvent.change(await linkField(), { target: { value: "https://youtu.be/AAAAAAAAAAA" } });

    fireEvent.click(showSwitch());

    await waitFor(() => expect(showSwitch()).toHaveAttribute("aria-checked", "true"));
    expect(await linkField()).toHaveValue("https://youtu.be/AAAAAAAAAAA");
  });

  it("removes the livestream after confirming", async () => {
    settings = { youtubeUrl: WATCH, isEnabled: true, embedUrl: EMBED };
    renderScreen();
    await linkField();

    fireEvent.click(screen.getByRole("button", { name: LIVESTREAM.remove.action }));
    const dialog = within(screen.getByRole("dialog", { name: LIVESTREAM.remove.title }));
    fireEvent.click(dialog.getByRole("button", { name: LIVESTREAM.remove.confirm }));

    expect(await screen.findByText(LIVESTREAM.remove.removed)).toBeInTheDocument();
    expect(patches).toEqual([{ youtubeUrl: null, isEnabled: false }]);
    expect(screen.getByText(LIVESTREAM.empty.title)).toBeInTheDocument();
    expect(await linkField()).toHaveValue("");
  });
});
