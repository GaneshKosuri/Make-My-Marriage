// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api-client";

import { SaveProblem, type SaveProblemCopy } from "./save-problem";

const copy: SaveProblemCopy = {
  conflict: { title: "This guest changed", description: "Reload it.", action: "Reload guest" },
  gone: { title: "Gone", description: "It was deleted." },
  error: { title: "Couldn't save", description: "Try again." },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("<SaveProblem />", () => {
  it("brings a new problem into view and focus, since Save is at the bottom of the form", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { rerender } = render(<SaveProblem error={null} onReload={vi.fn()} copy={copy} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <SaveProblem error={new ApiError(409, "CONFLICT", "x")} onReload={vi.fn()} copy={copy} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("This guest changed");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toContainElement(alert);
  });

  it("shows nothing for field errors, which sit next to their fields", () => {
    render(
      <SaveProblem
        error={new ApiError(400, "VALIDATION_ERROR", "x", { name: "Required" })}
        onReload={vi.fn()}
        copy={copy}
      />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
