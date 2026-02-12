import { expect, test } from "@playwright/test";
import {
  getGameState,
  positionDuckOverStack,
  startGame,
  waitForDuckLandingResult,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("Visual Animations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("squish animation triggers on landing", async ({ page }) => {
    await startGame(page);
    await positionDuckOverStack(page, 0);
    
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);
    
    // Check top duck scale immediately after landing
    const scaleY = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      const gs = (window as any).__gameState;
      const duck = gs.ducks[gs.ducks.length - 1];
      return duck.scaleY;
    });

    // Should be squished (< 1.0)
    expect(scaleY).toBeLessThan(1.0);
  });

  test("squish recovers over time", async ({ page }) => {
    await startGame(page);
    await positionDuckOverStack(page, 0);
    
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);
    
    // Wait for recovery animation
    await page.waitForTimeout(500); // 0.15 recovery per frame @ 60fps should be done
    
    const scaleY = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      const gs = (window as any).__gameState;
      const duck = gs.ducks[gs.ducks.length - 1];
      return duck.scaleY;
    });

    expect(scaleY).toBeCloseTo(1.0, 1);
  });
});
