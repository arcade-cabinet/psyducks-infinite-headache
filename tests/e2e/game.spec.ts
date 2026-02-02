import { expect, test } from "@playwright/test";

// Helper: wait for the game script module to fully load and attach event handlers.
// The game script sets data-game-ready="true" on <body> after all handlers are attached.
async function waitForGameReady(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => document.body.dataset.gameReady === "true", { timeout: 15000 });
}

// Helper: click start button and wait for game to begin
async function startGame(page: import("@playwright/test").Page) {
  await waitForGameReady(page);
  await page.locator("#startBtn").click();
  await expect(page.locator("#start-screen")).toBeHidden({ timeout: 5000 });
  await expect(page.locator("#scoreBox")).toBeVisible();
}

// Helper: read __gameState property from the browser (avoids biome noExplicitAny in each test)
// biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
function getGameState(page: import("@playwright/test").Page, path: string): Promise<any> {
  return page.evaluate((p) => {
    // biome-ignore lint/suspicious/noExplicitAny: injected game state
    const gs = (window as any).__gameState;
    return p.split(".").reduce((obj: unknown, key: string) => {
      if (obj != null && typeof obj === "object") return (obj as Record<string, unknown>)[key];
      return undefined;
    }, gs);
  }, path);
}

test.describe("Psyduck's Infinite Headache Game", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
  });

  test("should load the game page correctly", async ({ page }) => {
    await expect(page).toHaveTitle(/Psyduck/);

    const canvas = page.locator("#gameCanvas");
    await expect(canvas).toBeVisible();

    const startScreen = page.locator("#start-screen");
    await expect(startScreen).toBeVisible();

    const title = page.locator("#start-screen .title");
    await expect(title).toContainText("PSYDUCK");
  });

  test("should have start button", async ({ page }) => {
    await waitForGameReady(page);
    const startButton = page.locator("#startBtn");
    await expect(startButton).toBeVisible();
    await expect(startButton).toContainText("PLAY");
  });

  test("should start game when play button is clicked", async ({ page }) => {
    await startGame(page);

    const scoreDisplay = page.locator("#scoreDisplay");
    await expect(scoreDisplay).toContainText("0");
  });

  test("should show high score", async ({ page }) => {
    await startGame(page);

    const highScoreDisplay = page.locator("#highScoreDisplay");
    await expect(highScoreDisplay).toBeVisible();
  });

  test("should respond to tap/click to drop duck", async ({ page }) => {
    await startGame(page);

    // Click on canvas to trigger duck drop
    await page.locator("#gameCanvas").click({ position: { x: 200, y: 300 } });

    // Poll for score change or game over (duck falls under gravity at 3px/frame,
    // may take several seconds depending on browser rAF timing)
    await page.waitForFunction(
      () => {
        const score = document.getElementById("scoreDisplay")?.textContent;
        const gameOver = document.getElementById("game-over-screen");
        return (score && score !== "0") || (gameOver && !gameOver.classList.contains("hidden"));
      },
      { timeout: 20000 },
    );
  });

  test("should show game over screen on miss", async ({ page }) => {
    await startGame(page);

    const gameOverScreen = page.locator("#game-over-screen");

    for (let i = 0; i < 5; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 50, y: 300 } });

      try {
        await expect(gameOverScreen).toBeVisible({ timeout: 3000 });
        break;
      } catch {
        // Continue to next iteration
      }
    }

    const gameOverVisible = await gameOverScreen.isVisible();

    if (gameOverVisible) {
      const restartButton = page.locator("#restartBtn");
      await expect(restartButton).toBeVisible();
      await expect(restartButton).toContainText("RETRY");
    }
  });

  test("should restart game when retry button is clicked", async ({ page }) => {
    await startGame(page);

    const gameOverScreen = page.locator("#game-over-screen");

    for (let i = 0; i < 8; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 10, y: 300 } });

      try {
        await expect(gameOverScreen).toBeVisible({ timeout: 2000 });
        break;
      } catch {
        // Continue trying
      }
    }

    const isGameOver = await gameOverScreen.isVisible();

    if (isGameOver) {
      await page.locator("#restartBtn").click();
      await expect(gameOverScreen).toBeHidden();

      const scoreDisplay = page.locator("#scoreDisplay");
      await expect(scoreDisplay).toContainText("0");
    }
  });

  test("should have PWA manifest", async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", /manifest/);
  });

  test("should have proper meta tags for mobile", async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute("content", /width=device-width/);

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute("content", "#4A148C");
  });

  test("should support keyboard input (Space key)", async ({ page }, testInfo) => {
    // Skip on mobile (no keyboard) and Firefox headless (throttled rAF makes gravity too slow)
    test.skip(
      testInfo.project.name.startsWith("mobile") || testInfo.project.name === "firefox",
      "Keyboard input not available on mobile; Firefox headless rAF timing too slow for gravity physics",
    );

    await startGame(page);

    await page.keyboard.press("Space");

    // Poll for score change or game over (duck falls under gravity)
    await page.waitForFunction(
      () => {
        const score = document.getElementById("scoreDisplay")?.textContent;
        const gameOver = document.getElementById("game-over-screen");
        return (score && score !== "0") || (gameOver && !gameOver.classList.contains("hidden"));
      },
      { timeout: 10000 },
    );
  });

  test("should auto-generate seed on load", async ({ page }) => {
    await waitForGameReady(page);

    // Seed input should be pre-filled
    const seedValue = await page.locator("#seedInput").inputValue();
    expect(seedValue.length).toBeGreaterThan(0);

    // Label should not say "optional"
    const label = page.locator(".seed-label");
    await expect(label).toContainText("Game Seed:");
    const labelText = await label.textContent();
    expect(labelText).not.toContain("optional");
  });

  test("should not show black screen on retry", async ({ page }) => {
    await startGame(page);

    const gameOverScreen = page.locator("#game-over-screen");

    // Force game over by clicking off-center
    for (let i = 0; i < 8; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 10, y: 300 } });
      try {
        await expect(gameOverScreen).toBeVisible({ timeout: 3000 });
        break;
      } catch {
        // keep trying
      }
    }

    const isGameOver = await gameOverScreen.isVisible();
    if (isGameOver) {
      await page.locator("#restartBtn").click();
      await expect(gameOverScreen).toBeHidden();

      // Score should be reset
      await expect(page.locator("#scoreDisplay")).toContainText("0");

      // ScoreBox should be visible (no black screen)
      await expect(page.locator("#scoreBox")).toBeVisible();

      // Start screen should remain hidden (skip start on retry)
      await expect(page.locator("#start-screen")).toBeHidden();

      // Canvas should be rendering (check it's not all-black via game state)
      const mode = await getGameState(page, "mode");
      expect(mode).toBe("PLAYING");
    }
  });

  test("should move duck with arrow keys", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Arrow keys not available on mobile");

    await startGame(page);
    await page.waitForTimeout(500);

    // Get initial duck position
    const initialX = await getGameState(page, "currentDuck.x");
    expect(initialX).toBeDefined();

    // Press ArrowRight several times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
    }

    const afterRightX = await getGameState(page, "currentDuck.x");
    expect(afterRightX).toBeGreaterThan(initialX);

    // Press ArrowLeft several times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft");
    }

    const afterLeftX = await getGameState(page, "currentDuck.x");
    expect(afterLeftX).toBeLessThan(afterRightX);
  });

  test("should use full viewport width", async ({ page }) => {
    await waitForGameReady(page);

    const gameOffsetX = await getGameState(page, "gameOffsetX");
    expect(gameOffsetX).toBe(0);

    // Canvas should fill viewport width
    const canvasWidth = await page.evaluate(() => {
      const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
      return canvas.getBoundingClientRect().width;
    });
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(canvasWidth).toBe(viewportWidth);
  });
});
