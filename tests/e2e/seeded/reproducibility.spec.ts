import { expect, test } from "@playwright/test";
import {
  getGameState,
  startSeededGame,
  waitForGameReady,
  waitForNewDuckResult,
} from "../../e2e/helpers";

test.describe("Seeded Randomness Reproducibility", () => {
  const TEST_SEED = "psyduck-repro-test";

  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("same seed should produce identical spawn positions", async ({ page }) => {
    // Run 1
    await startSeededGame(page, TEST_SEED);
    await waitForNewDuckResult(page);
    const spawnX1 = await getGameState(page, "currentDuck.spawnX");
    
    // Restart
    await page.reload();
    await waitForGameReady(page);
    
    // Run 2
    await startSeededGame(page, TEST_SEED);
    await waitForNewDuckResult(page);
    const spawnX2 = await getGameState(page, "currentDuck.spawnX");

    expect(spawnX1).toBe(spawnX2);
  });

  test("same seed should produce identical level configs", async ({ page }) => {
    await startSeededGame(page, TEST_SEED);
    
    const config1 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      const gs = (window as any).__gameState;
      return gs.levelConfigs[0];
    });

    await page.reload();
    await waitForGameReady(page);
    await startSeededGame(page, TEST_SEED);

    const config2 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      const gs = (window as any).__gameState;
      return gs.levelConfigs[0];
    });

    expect(config1).toEqual(config2);
  });
});
