// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NAV_LINKS, ROUTES } from "../home-content";
import { MobileMenu } from "./mobile-menu";

beforeEach(() => {
  // jsdom has no matchMedia; the menu listens for the desktop breakpoint while open.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderMenu() {
  render(<MobileMenu links={NAV_LINKS} signIn={{ label: "Sign in", href: ROUTES.signIn }} />);
  return screen.getByRole("button", { name: "Open menu" });
}

describe("<MobileMenu />", () => {
  it("starts closed and opens on tap", () => {
    const button = renderMenu();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Menu" })).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAccessibleName("Close menu");
    const nav = screen.getByRole("navigation", { name: "Menu" });
    expect(nav).toBeVisible();
    for (const link of NAV_LINKS) {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", ROUTES.signIn);
  });

  it("closes on Escape", () => {
    const button = renderMenu();
    fireEvent.click(button);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes after a link is chosen", () => {
    const button = renderMenu();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("link", { name: "Guests" }));
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
