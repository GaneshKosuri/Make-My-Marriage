// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { navItemsForRole } from "./nav-items";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/guests/rsvp" }));

afterEach(cleanup);

describe("<Sidebar />", () => {
  it("renders the PRD §10 sections and the members link for Admins", () => {
    render(<Sidebar items={navItemsForRole("ADMIN")} />);
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
    render(<Sidebar items={navItemsForRole("MANAGER")} />);
    expect(screen.queryByRole("link", { name: "Wedding Members" })).not.toBeInTheDocument();
  });

  it("marks only the current sub-page as current", () => {
    render(<Sidebar items={navItemsForRole("ADMIN")} />);
    expect(screen.getByRole("link", { name: "RSVP" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Guest List" })).not.toHaveAttribute("aria-current");
  });
});
