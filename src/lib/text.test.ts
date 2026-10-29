import { describe, expect, it } from "vitest";

import { withArticle } from "./text";

describe("withArticle", () => {
  it("uses 'an' before a vowel and 'a' otherwise, whatever the case", () => {
    expect(withArticle("Admin")).toBe("an Admin");
    expect(withArticle("admin")).toBe("an admin");
    expect(withArticle("Manager")).toBe("a Manager");
  });
});
