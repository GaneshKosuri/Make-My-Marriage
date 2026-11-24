// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WEBSITE_THEMES, type WebsiteTheme } from "@/modules/weddings/wedding.constants";
import type { PublicWeddingDto } from "@/modules/weddings/wedding.types";

import { ThemedWebsite } from ".";
import { THEME_COPY } from "./shared";

const wedding = (extra: Partial<PublicWeddingDto> = {}): PublicWeddingDto => ({
  brideName: "Princi",
  groomName: "Akshay",
  title: "Akshay & Princi",
  description: "Two families, one celebration.",
  welcomeMessage: "We would love for you to celebrate with us.",
  weddingDate: "2027-02-14",
  timeZone: "Asia/Kolkata",
  place: "Dehradun, Uttarakhand",
  coverImageUrl: "https://storage.example/cover.jpg",
  theme: "CLASSIC",
  events: [
    {
      name: "Mehendi",
      startsAt: "2027-02-12T10:30:00.000Z",
      endsAt: "2027-02-12T15:30:00.000Z",
      venueName: "Courtyard Greens",
      address: "Rajpur Road, Dehradun",
      dressCode: "Festive green",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Courtyard%20Greens",
    },
    {
      name: "Wedding",
      startsAt: "2027-02-14T12:00:00.000Z",
      endsAt: null,
      venueName: null,
      address: null,
      dressCode: null,
      mapUrl: null,
    },
  ],
  gallery: { enabled: true, url: "https://makemymarriage.example/gallery/abc" },
  livestream: {
    enabled: true,
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
  },
  ...extra,
});

const show = (theme: WebsiteTheme, extra: Partial<PublicWeddingDto> = {}) =>
  render(<ThemedWebsite wedding={wedding({ theme, ...extra })} />);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-24T06:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe.each(WEBSITE_THEMES)("the %s theme", (theme) => {
  it("shows the same wedding content as every other theme", () => {
    show(theme);

    expect(screen.getByRole("heading", { level: 1, name: "Akshay & Princi" })).toBeInTheDocument();
    expect(screen.getAllByText(/14 February 2027/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Dehradun, Uttarakhand/).length).toBeGreaterThan(0);
    expect(screen.getByText("We would love for you to celebrate with us.")).toBeInTheDocument();
    expect(screen.getByText("Two families, one celebration.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Akshay & Princi" })).toHaveAttribute(
      "src",
      "https://storage.example/cover.jpg",
    );

    const events = within(screen.getByRole("region", { name: THEME_COPY.events }));
    expect(events.getByRole("heading", { name: "Mehendi" })).toBeInTheDocument();
    expect(events.getByRole("heading", { name: "Wedding" })).toBeInTheDocument();
    expect(events.getByText(/4:00 pm – 9:00 pm/)).toBeInTheDocument();
    expect(events.getByText(/5:30 pm onwards/)).toBeInTheDocument();
    expect(events.getByText(/Courtyard Greens, Rajpur Road, Dehradun/)).toBeInTheDocument();
    expect(events.getByText(THEME_COPY.dressCode("Festive green"))).toBeInTheDocument();
    expect(events.getAllByRole("link", { name: /Open in Google Maps/ })).toHaveLength(1);

    expect(screen.getByTitle(THEME_COPY.playerTitle("Akshay & Princi"))).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1",
    );
    expect(screen.getByRole("link", { name: THEME_COPY.photosButton })).toHaveAttribute(
      "href",
      "https://makemymarriage.example/gallery/abc",
    );
    expect(screen.getByText(THEME_COPY.withLove("Akshay & Princi"))).toBeInTheDocument();
  });

  it("leaves out what the family hasn't added or switched on", () => {
    show(theme, {
      coverImageUrl: null,
      welcomeMessage: null,
      description: null,
      events: [],
      gallery: { enabled: false, url: null },
      livestream: { enabled: false, youtubeUrl: null, embedUrl: null },
    });

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("region", { name: THEME_COPY.welcome })).toBeNull();
    expect(screen.getByText(THEME_COPY.noEvents)).toBeInTheDocument();
    expect(screen.queryByTitle(/livestream/)).toBeNull();
    expect(screen.queryByRole("link", { name: THEME_COPY.photosButton })).toBeNull();
  });

  it("counts down to the day, and stops once the couple is married", () => {
    const { unmount } = show(theme);
    expect(screen.getAllByText(/82/).length).toBeGreaterThan(0);
    unmount();

    vi.setSystemTime(new Date("2027-03-01T06:00:00Z"));
    show(theme);
    expect(screen.queryByText(/days? to go/)).toBeNull();
  });
});
