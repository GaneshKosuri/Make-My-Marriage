// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render as rtlRender, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { navItemsForRole } from "./nav-items";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/guests/rsvp",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

afterEach(cleanup);

const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("<Sidebar />", () => {
  it("renders the PRD §10 sections and the members link for Admins", () => {
    render(<Sidebar items={navItemsForRole("ADMIN")} userName="Akshay Saini" role="ADMIN" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const label of [
      "Dashboard",
      "Events",
      "Tasks",
      "Guests",
      "Expenses",
      "Vendors",
      "Wedding Website",
      "Photos",
      "Live Stream",
      "Settings",
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(within(nav).getByRole("link", { name: "Wedding Members" })).toHaveAttribute(
      "href",
      "/app/settings/members",
    );
  });

  it("hides the members link from Managers", () => {
    render(<Sidebar items={navItemsForRole("MANAGER")} userName="Priya Agarwal" role="MANAGER" />);
    expect(screen.queryByRole("link", { name: "Wedding Members" })).not.toBeInTheDocument();
  });

  it("shows who is signed in, with their role and Sign out", () => {
    render(<Sidebar items={navItemsForRole("MANAGER")} userName="Priya Agarwal" role="MANAGER" />);
    expect(screen.getByText("Priya Agarwal")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("marks only the current sub-page as current", () => {
    render(<Sidebar items={navItemsForRole("ADMIN")} userName="Akshay Saini" role="ADMIN" />);
    expect(screen.getByRole("link", { name: "RSVP" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Guest List" })).not.toHaveAttribute("aria-current");
  });
});
