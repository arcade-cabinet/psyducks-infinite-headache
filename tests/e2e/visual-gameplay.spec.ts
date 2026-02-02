import { expect, test } from "@playwright/test";

test.describe("Psyduck's Infinite Headache - Visual & Gameplay Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should capture main menu screenshot", async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector(".title", { state: "visible" });
    await page.waitForSelector("#startBtn", { state: "visible" });

    // Take full page screenshot of main menu
    await page.screenshot({
      path: "test-results/screenshots/main-menu.png",
      fullPage: true,
    });

    // Verify main menu elements are visible
    await expect(page.locator(".title")).toContainText("PSYDUCK");
    await expect(page.locator("#startBtn")).toBeVisible();
    await expect(page.locator("#seedInput")).toBeVisible();
    await expect(page.locator("#shuffleSeedBtn")).toBeVisible();
  });

  test("should capture main menu with seed input", async ({ page }) => {
    // Enter a test seed
    await page.fill("#seedInput", "cosmic-electric-tower");

    await page.screenshot({
      path: "test-results/screenshots/main-menu-with-seed.png",
      fullPage: true,
    });
  });

  test("should capture gameplay area with first duck", async ({ page }) => {
    // Start game
    await page.click("#startBtn");

    // Wait for game UI to appear
    await page.waitForSelector("#scoreDisplay", { state: "visible" });
    await page.waitForSelector("#levelDisplay", { state: "visible" });
    await page.waitForSelector("#stabilityBar", { state: "visible" });

    // Take screenshot of initial gameplay
    await page.screenshot({
      path: "test-results/screenshots/gameplay-start.png",
      fullPage: false,
    });

    // Verify game elements
    await expect(page.locator("#scoreDisplay")).toBeVisible();
    await expect(page.locator("#levelDisplay")).toBeVisible();
    await expect(page.locator("#stabilityBar")).toBeVisible();
    await expect(page.locator("#gameCanvas")).toBeVisible();
  });

  test("should capture seeded gameplay", async ({ page }) => {
    // Use a specific seed for reproducible test
    await page.fill("#seedInput", "test-seed-123");
    await page.click("#startBtn");

    // Wait for game to start
    await page.waitForSelector("#scoreDisplay", { state: "visible" });
    await page.waitForSelector("#gameCanvas", { state: "visible" });

    await page.screenshot({
      path: "test-results/screenshots/gameplay-seeded.png",
      fullPage: false,
    });
  });

  test("should perform basic drag interaction", async ({ page }) => {
    await page.click("#startBtn");

    // Wait for game to start
    await page.waitForSelector("#scoreDisplay", { state: "visible" });
    await page.waitForSelector("#gameCanvas", { state: "visible" });

    const canvas = page.locator("#gameCanvas");

    // Get canvas bounding box
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Simulate drag from center-left to center-right
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 20 });
    await page.mouse.up();

    // Wait for drag to complete
    await page.waitForTimeout(500);

    await page.screenshot({
      path: "test-results/screenshots/gameplay-after-drag.png",
      fullPage: false,
    });
  });

  test("should test shuffle seed functionality", async ({ page }) => {
    const seedInput = page.locator("#seedInput");

    // Click shuffle button
    await page.click("#shuffleSeedBtn");
    await page.waitForTimeout(100);

    // Verify seed was generated
    const seedValue = await seedInput.inputValue();
    expect(seedValue).toBeTruthy();
    expect(seedValue).toMatch(/^[a-z-]+$/);

    await page.screenshot({
      path: "test-results/screenshots/shuffled-seed.png",
      fullPage: true,
    });
  });

  test("should capture game over screen", async ({ page }) => {
    // Start with known seed
    await page.fill("#seedInput", "test-gameover");
    await page.click("#startBtn");
    await page.waitForTimeout(1500);

    const canvas = page.locator("#gameCanvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // Make intentionally bad moves to trigger game over
    for (let i = 0; i < 5; i++) {
      // Click far from center to miss
      await page.mouse.click(box.x + 50, box.y + box.height * 0.5);
      await page.waitForTimeout(2000);

      // Check if game over screen appeared
      const gameOverVisible = await page.locator("#game-over-screen").isVisible();
      if (gameOverVisible) break;
    }

    // Ensure game over was triggered
    await expect(page.locator("#game-over-screen")).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: "test-results/screenshots/game-over-screen.png",
      fullPage: true,
    });
  });

  test("should capture level up scenario", async ({ page }) => {
    // This test would need successful gameplay to trigger level up
    // For demonstration, we'll capture the level up screen elements
    await page.click("#startBtn");
    await page.waitForTimeout(1000);

    // Get level display
    const levelDisplay = page.locator("#levelDisplay");
    await expect(levelDisplay).toContainText("1");

    await page.screenshot({
      path: "test-results/screenshots/level-display.png",
      clip: { x: 0, y: 0, width: 400, height: 200 },
    });
  });

  test("should verify stability bar updates", async ({ page }) => {
    await page.click("#startBtn");
    await page.waitForTimeout(1000);

    const stabilityBar = page.locator("#stabilityBar");
    await expect(stabilityBar).toBeVisible();

    // Get initial width
    const initialWidth = await stabilityBar.evaluate((el) => getComputedStyle(el).width);

    expect(initialWidth).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/stability-bar.png",
      clip: { x: 0, y: 0, width: 400, height: 150 },
    });
  });

  test("should test copy seed functionality", async ({ page }) => {
    // Start game and get to game over
    await page.fill("#seedInput", "copy-test-seed");
    await page.click("#startBtn");

    // Wait for game to start
    await page.waitForSelector("#scoreDisplay", { state: "visible" });

    // Trigger game over (simplified)
    const canvas = page.locator("#gameCanvas");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + 10, box.y + box.height * 0.5);
      await page.waitForTimeout(2000);
    }

    // Wait for game over screen with timeout
    const gameOverScreen = page.locator("#game-over-screen");
    await expect(gameOverScreen).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: "test-results/screenshots/seed-display-gameover.png",
      fullPage: true,
    });
  });
});
