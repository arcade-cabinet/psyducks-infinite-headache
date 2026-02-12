import { expect, test } from "@playwright/test";
import {
  getGameState,
  positionDuckOverStack,
  startGame,
  waitForDuckLandingResult,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("UI - Score Display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("score should show 0 on start", async ({ page }) => {
    await startGame(page);
    const score = await page.textContent("#scoreDisplay");
    expect(score).toBe("0");
  });

  test("score should update on landing", async ({ page }) => {
    await startGame(page);
    
    // Land a duck
    await positionDuckOverStack(page, 0);
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);

    const score = await page.textContent("#scoreDisplay");
    expect(score).toBe("1");
  });

  test("high score should persist", async ({ page }) => {
    // Clear storage first
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForGameReady(page);
    await startGame(page);

    // Get initial high score
    const initialHighScore = await page.textContent("#highScoreDisplay");
    expect(initialHighScore).toBe("0");

    // Score points
    await positionDuckOverStack(page, 0);
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0); // Score 1

    // Game over
    await page.keyboard.press("ArrowRight"); // move away
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space"); // drop miss
    await expect(page.locator("#game-over-screen")).toBeVisible();

    // Reload page
    await page.reload();
    await waitForGameReady(page);
    await startGame(page);

    // Check high score persisted
    const newHighScore = await page.textContent("#highScoreDisplay");
    expect(newHighScore).toBe("1");
  });
});
