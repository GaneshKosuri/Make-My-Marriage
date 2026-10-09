import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("lets later utilities win", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("keeps design-system font sizes alongside text colours", () => {
    expect(cn("text-headline-sm", "text-burgundy")).toBe("text-headline-sm text-burgundy");
    expect(cn("text-eyebrow text-plum", "lg:text-body-lg")).toBe(
      "text-eyebrow text-plum lg:text-body-lg",
    );
  });

  it("still resolves conflicting font sizes", () => {
    expect(cn("text-body-sm", "text-title-md")).toBe("text-title-md");
  });
});
