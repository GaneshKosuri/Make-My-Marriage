// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { isComingSoon, upcomingFeaturesSentence } from "../feature-availability";
import { FEATURE_CARDS, ROUTES } from "../home-content";
import { HomePage } from "./home-page";

afterEach(cleanup);

describe("<HomePage />", () => {
  it("renders the hero heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Your whole wedding, in one place.",
    );
  });

  it("sends every 'Start planning' to sign-up and every 'Sign in' to log-in", () => {
    render(<HomePage />);
    const startLinks = screen.getAllByRole("link", { name: /start planning/i });
    expect(startLinks.length).toBeGreaterThanOrEqual(3);
    for (const link of startLinks) expect(link).toHaveAttribute("href", ROUTES.signUp);

    const signInLinks = screen.getAllByRole("link", { name: "Sign in" });
    expect(signInLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of signInLinks) expect(link).toHaveAttribute("href", ROUTES.signIn);
  });

  it("points every in-page link at a section that exists", () => {
    const { container } = render(<HomePage />);
    const anchors = [...container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const id = anchor.getAttribute("href")!.slice(1);
      expect(document.getElementById(id), `#${id}`).not.toBeNull();
    }
  });

  it("shows 'Coming soon' exactly on the features that are not live yet", () => {
    render(<HomePage />);
    for (const card of FEATURE_CARDS) {
      const article = screen
        .getByRole("heading", { level: 3, name: card.title })
        .closest("article");
      expect(article, card.title).not.toBeNull();
      const badge = within(article!).queryByText("Coming soon");
      expect(Boolean(badge), card.title).toBe(isComingSoon(card.feature));
    }
  });

  it("answers 'What features are coming next?' from the availability list", () => {
    render(<HomePage />);
    const upcoming = upcomingFeaturesSentence();
    expect(upcoming).not.toBeNull();
    expect(screen.getByText("What features are coming next?")).toBeInTheDocument();
    expect(screen.getByText(upcoming!)).toBeInTheDocument();
  });

  it("opens only the first FAQ answer", () => {
    const { container } = render(<HomePage />);
    const details = [...container.querySelectorAll("details")];
    expect(details.length).toBeGreaterThanOrEqual(4);
    expect(details.map((item) => item.open)).toEqual(details.map((_, index) => index === 0));
  });

  it("stays within PRD V1 scope (PRD §7 non-goals)", () => {
    const { container } = render(<HomePage />);
    const text = container.textContent ?? "";
    for (const outOfScope of [
      /seating/i,
      /dietary|vegetarian|meal/i,
      /budget/i,
      /shagun|advance payment|paid:/i,
      /contract/i,
      /registry/i,
      /real[- ]?time|instant sync/i,
      /hotel|shuttle|transport/i,
      /custom domain|\.wedding\b/i,
      /multi-currency/i,
    ]) {
      expect(text).not.toMatch(outOfScope);
    }
  });
});
