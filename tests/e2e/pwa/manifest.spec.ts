import { expect, test } from "@playwright/test";

test.describe("PWA Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
  });

  test("manifest link exists", async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveCount(1);
  });

  test("viewport meta tag is configured", async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);
  });

  test("theme-color meta tag is set", async ({ page }) => {
    const theme = page.locator('meta[name="theme-color"]');
    await expect(theme).toHaveCount(1);
  });
});
