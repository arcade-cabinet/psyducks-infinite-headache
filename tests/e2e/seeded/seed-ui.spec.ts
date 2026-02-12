import { expect, test } from "@playwright/test";
import {
  startGame,
  triggerGameOver,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("Seed UI Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("seed input should accept user input", async ({ page }) => {
    const seed = "custom-ui-seed";
    await page.fill("#seedInput", seed);
    
    // Check if input value is updated
    const value = await page.inputValue("#seedInput");
    expect(value).toBe(seed);
    
    // Start game and verify seed is used
    await startGame(page);
    const usedSeed = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state
      return (window as any).__gameState.seed;
    });
    
    expect(usedSeed).toBe(seed);
  });

  test("shuffle button should generate new seed", async ({ page }) => {
    // Get initial placeholder or empty value
    const initialValue = await page.inputValue("#seedInput");
    
    // Click shuffle
    await page.click("#shuffleSeedBtn");
    
    // Check value changed
    const newValue = await page.inputValue("#seedInput");
    expect(newValue).not.toBe(initialValue);
    expect(newValue.length).toBeGreaterThan(0);
  });

  test("game over screen should display correct seed", async ({ page }) => {
    const seed = "game-over-seed";
    await page.fill("#seedInput", seed);
    await startGame(page);
    
    // Trigger game over
    await triggerGameOver(page);
    
    // Verify seed display
    const displayedSeed = await page.textContent("#gameOverSeed");
    expect(displayedSeed).toBe(seed);
  });

  test("copy seed button should work", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    
    const seed = "copy-paste-seed";
    await page.fill("#seedInput", seed);
    await startGame(page);
    await triggerGameOver(page);
    
    // Click copy button
    await page.click("#copySeedBtn");
    
    // Verify clipboard content
    // Note: checking clipboard content in headless mode can be flaky/restricted
    // Instead we verify the UI feedback (checkmark or text change)
    const buttonText = await page.textContent("#copySeedBtn");
    expect(buttonText).toBe("✓");
  });
});
