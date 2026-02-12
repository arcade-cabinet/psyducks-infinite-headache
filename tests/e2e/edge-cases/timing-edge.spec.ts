import { expect, test } from "@playwright/test";
import {
  positionDuckOverStack,
  startGame,
  waitForDuckLandingResult,
  waitForGameReady,
  waitForNewDuckResult,
} from "../../e2e/helpers";

test.describe("Edge Cases - Timing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("spawn timing after landing", async ({ page }) => {
    await startGame(page);
    await positionDuckOverStack(page, 0);
    
    const startTime = Date.now();
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);
    
    // Wait for next spawn
    await waitForNewDuckResult(page);
    const duration = Date.now() - startTime;
    
    // Spawn interval is ~2000ms base - reduction + fall time
    // Should be at least 500ms (fastest possible) and max 4000ms
    expect(duration).toBeGreaterThan(500);
    expect(duration).toBeLessThan(4000);
  });
});
