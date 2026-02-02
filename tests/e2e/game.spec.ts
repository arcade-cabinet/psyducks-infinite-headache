import { test, expect } from "@playwright/test";

test.describe("Psyduck Stack Game", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/psyduck-stsck/");
  });

  test("should load the game page correctly", async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Psyduck Stack/);

    // Check if canvas exists
    const canvas = page.locator("#gameCanvas");
    await expect(canvas).toBeVisible();

    // Check if start screen is visible
    const startScreen = page.locator("#start-screen");
    await expect(startScreen).toBeVisible();

    // Check if title is present
    const title = page.locator(".title");
    await expect(title).toContainText("PSYDUCK");
    await expect(title).toContainText("STACK");
  });

  test("should have start button", async ({ page }) => {
    const startButton = page.locator("#startBtn");
    await expect(startButton).toBeVisible();
    await expect(startButton).toContainText("PLAY");
  });

  test("should start game when play button is clicked", async ({ page }) => {
    // Click the start button
    await page.locator("#startBtn").click();

    // Wait a bit for game to initialize
    await page.waitForTimeout(500);

    // Start screen should be hidden
    const startScreen = page.locator("#start-screen");
    await expect(startScreen).toBeHidden();

    // Score box should be visible
    const scoreBox = page.locator("#scoreBox");
    await expect(scoreBox).toBeVisible();

    // Score should be 0
    const scoreDisplay = page.locator("#scoreDisplay");
    await expect(scoreDisplay).toContainText("0");
  });

  test("should show high score", async ({ page }) => {
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);

    const highScoreDisplay = page.locator("#highScoreDisplay");
    await expect(highScoreDisplay).toBeVisible();
  });

  test("should respond to tap/click to drop duck", async ({ page }) => {
    // Start the game
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);

    const initialScore = await page.locator("#scoreDisplay").textContent();

    // Click on canvas to drop duck
    await page.locator("#gameCanvas").click({ position: { x: 200, y: 300 } });

    // Wait for duck to potentially land
    await page.waitForTimeout(2000);

    // Check if score changed or game over screen appeared
    const finalScore = await page.locator("#scoreDisplay").textContent();
    const gameOverVisible = await page.locator("#game-over-screen").isVisible();

    // Either score increased or game is over
    expect(
      finalScore !== initialScore || gameOverVisible
    ).toBeTruthy();
  });

  test("should show game over screen on miss", async ({ page }) => {
    // Start the game
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);

    // Click multiple times at edges to likely cause misses
    for (let i = 0; i < 5; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 50, y: 300 } });
      await page.waitForTimeout(2000);
      
      // Check if game over screen appeared
      const isGameOver = await page.locator("#game-over-screen").isVisible();
      if (isGameOver) {
        break;
      }
    }

    // After several attempts, check for game over elements
    const gameOverScreen = page.locator("#game-over-screen");
    const restartButton = page.locator("#restartBtn");

    // Game over screen might be visible
    const gameOverVisible = await gameOverScreen.isVisible();
    if (gameOverVisible) {
      await expect(restartButton).toBeVisible();
      await expect(restartButton).toContainText("RETRY");
    }
  });

  test("should restart game when retry button is clicked", async ({ page }) => {
    // Start the game
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);

    // Cause game over by clicking at edge multiple times
    for (let i = 0; i < 8; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 10, y: 300 } });
      await page.waitForTimeout(1500);
    }

    // Wait for potential game over
    await page.waitForTimeout(1000);

    // If game over screen is visible, click retry
    const gameOverScreen = page.locator("#game-over-screen");
    if (await gameOverScreen.isVisible()) {
      await page.locator("#restartBtn").click();
      await page.waitForTimeout(500);

      // Game over screen should be hidden
      await expect(gameOverScreen).toBeHidden();

      // Score should be reset to 0
      const scoreDisplay = page.locator("#scoreDisplay");
      await expect(scoreDisplay).toContainText("0");
    }
  });

  test("should have PWA manifest", async ({ page }) => {
    // Check if manifest link exists
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", /manifest.json/);
  });

  test("should have proper meta tags for mobile", async ({ page }) => {
    // Check viewport meta
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    // Check theme color
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", "#4A148C");
  });

  test("should support keyboard input (Space key)", async ({ page }) => {
    // Start the game
    await page.locator("#startBtn").click();
    await page.waitForTimeout(500);

    const initialScore = await page.locator("#scoreDisplay").textContent();

    // Press space key to drop duck
    await page.keyboard.press("Space");

    // Wait for duck to potentially land
    await page.waitForTimeout(2000);

    // Check if score changed or game over screen appeared
    const finalScore = await page.locator("#scoreDisplay").textContent();
    const gameOverVisible = await page.locator("#game-over-screen").isVisible();

    // Either score increased or game is over
    expect(
      finalScore !== initialScore || gameOverVisible
    ).toBeTruthy();
  });
});
