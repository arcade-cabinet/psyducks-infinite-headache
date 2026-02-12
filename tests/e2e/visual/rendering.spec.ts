import { expect, test } from "@playwright/test";
import {
  expectCanvasRendering,
  startGame,
  triggerGameOver,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("Visual Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("canvas not all-black during play", async ({ page }) => {
    await startGame(page);
    await expectCanvasRendering(page);
  });

  test("no black screen on retry", async ({ page }) => {
    await startGame(page);
    await triggerGameOver(page);
    
    await page.click("#restartBtn");
    await expect(page.locator("#scoreBox")).toBeVisible();
    await expectCanvasRendering(page);
  });
});
