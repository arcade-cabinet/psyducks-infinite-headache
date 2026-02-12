import { expect, test } from "@playwright/test";
import {
  getGameState,
  startGame,
  waitForGameMode,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("Edge Cases - Concurrent Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("merge at level up threshold", async ({ page }) => {
    await startGame(page);
    
    // Setup state: mergeCount = 4, base duck almost wide enough
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      const gs = (window as any).__gameState;
      gs.mergeCount = 4;
      gs.ducks[0].w = gs.width * 0.82; // Just below 0.85 threshold
    });

    // Land a duck -> Trigger Merge -> Check if size increase triggers Level Up immediately
    await page.keyboard.press("Space"); // Drop blindly, assume center alignment
    
    // Wait for level up mode
    await waitForGameMode(page, "LEVELUP", 5000);
    
    const mode = await getGameState(page, "mode");
    expect(mode).toBe("LEVELUP");
  });
});
