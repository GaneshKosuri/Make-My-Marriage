import { expect, test } from "@playwright/test";

/**
 * Scaffold smoke tests. They need no database or secrets.
 * Run: npx playwright install chromium (once), then npm run test:e2e.
 */

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your whole wedding");
  const startPlanning = page.getByRole("link", { name: "Start planning" }).first();
  await expect(startPlanning).toBeVisible();
  await expect(startPlanning).toHaveAttribute("href", "/signup");
});

test("signed-out /app redirects to /login", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

// Under a full parallel run, `next dev` can take a few seconds to hydrate a page
// and to compile the next one, so these waits are longer than the default.
const NAVIGATION = { timeout: 15_000 };

test("auth pages render and link to each other", async ({ page }) => {
  // Click only once the dev page has finished loading and hydrating.
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup$/, NAVIGATION);
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible(NAVIGATION);
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/, NAVIGATION);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible(NAVIGATION);
});

test("guest invitation pages are noindex and leak no referrer", async ({ request }) => {
  const response = await request.get("/invite/x");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
});

test("API answers unauthenticated member calls with the error envelope", async ({ request }) => {
  const response = await request.get("/api/tasks");
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({
    error: { code: "UNAUTHENTICATED", message: "Please sign in to continue." },
  });
});

test("an unusable member invitation link explains itself", async ({ page }) => {
  const response = await page.goto("/join/not-a-real-token");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    page.getByRole("heading", { name: "This invitation is no longer valid" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/login");
});

test("a signed-out deep link remembers the page for after sign-in", async ({ page }) => {
  await page.goto("/app/settings/members");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fsettings%2Fmembers$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});
