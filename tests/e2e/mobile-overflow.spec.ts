import { expect, test } from "@playwright/test";

/**
 * Mobile guard rail (QA hand-off "qa-mobile-320-360"): no public page may scroll
 * sideways on the narrowest phones we support. Needs no database or secrets.
 * The signed-in pages are covered by the component-level wrapping rules.
 */

const WIDTHS = [320, 360] as const;
const ROUTES = ["/", "/login", "/signup", "/forgot-password"] as const;

// One viewport per width is enough; the desktop project would only repeat it.
test.skip(({ isMobile }) => !isMobile, "phone widths only");

for (const width of WIDTHS) {
  test.describe(`${width} px wide`, () => {
    test.use({ viewport: { width, height: 720 } });
    // A cold `next dev` compiles each page on first visit.
    test.setTimeout(60_000);

    for (const route of ROUTES) {
      test(`${route} has no sideways scroll`, async ({ page }) => {
        await page.goto(route, { waitUntil: "networkidle" });
        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        expect(
          scrollWidth,
          `page is ${scrollWidth} px wide in a ${innerWidth} px window`,
        ).toBeLessThanOrEqual(innerWidth);
      });
    }
  });
}
