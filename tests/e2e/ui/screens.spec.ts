import { expect, test } from "@playwright/test";
import {
  startGame,
  triggerGameOver,
  triggerLevelUp,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("UI - Screens", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("help screen toggle", async ({ page }) => {
    // Open help
    await page.click("#helpBtn");
    await expect(page.locator("#help-screen")).toBeVisible();
    await expect(page.locator("#start-screen")).toBeHidden();

    // Close help
    await page.click("#helpCloseBtn");
    await expect(page.locator("#help-screen")).toBeHidden();
    await expect(page.locator("#start-screen")).toBeVisible();
  });

  test("game over screen display", async ({ page }) => {
    await startGame(page);
    await triggerGameOver(page);
    
    await expect(page.locator("#game-over-screen")).toBeVisible();
    await expect(page.locator("#finalScore")).toBeVisible();
    await expect(page.locator("#restartBtn")).toBeVisible();
  });

  test("level up screen display", async ({ page }) => {
    await startGame(page);
    await triggerLevelUp(page);
    
    await expect(page.locator("#level-up-screen")).toBeVisible();
    await expect(page.locator("#newLevelDisplay")).toContainText("2"); // Level 1 -> 2
    await expect(page.locator("#continueLevelBtn")).toBeVisible();
  });
});
