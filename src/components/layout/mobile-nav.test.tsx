// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MemberRole } from "@/modules/members/member.constants";

import { MobileNav } from "./mobile-nav";
import { navItemsForRole } from "./nav-items";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

afterEach(cleanup);

function renderNav(role: MemberRole = "ADMIN") {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MobileNav
        items={navItemsForRole(role)}
        userName="Akshay Saini"
        userEmail="akshay@example.com"
        role={role}
      />
    </QueryClientProvider>,
  );
}

describe("<MobileNav />", () => {
  it("shows Home, Events, Guests, Tasks and More in the bottom bar", () => {
    renderNav();
    const bar = within(screen.getByRole("navigation", { name: "Primary" }));
    expect(bar.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    for (const label of ["Events", "Guests", "Tasks"]) {
      expect(bar.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(bar.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the More sheet with the other pages, the member and Sign out", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: "More" }));

    const sheet = within(screen.getByRole("dialog", { name: "More" }));
    expect(sheet.getByRole("region", { name: "Plan" })).toBeInTheDocument();
    expect(sheet.getByRole("link", { name: /My Vendors/ })).toHaveAttribute("href", "/app/vendors");
    expect(sheet.getByRole("link", { name: /Wedding Members/ })).toBeInTheDocument();
    expect(sheet.getByText("akshay@example.com")).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to More", () => {
    renderNav();
    const more = screen.getByRole("button", { name: "More" });
    fireEvent.click(more);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(more).toHaveFocus();
  });

  it("lists Wedding Members for Managers too", () => {
    renderNav("MANAGER");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: /Wedding Members/ })).toBeInTheDocument();
  });
});
