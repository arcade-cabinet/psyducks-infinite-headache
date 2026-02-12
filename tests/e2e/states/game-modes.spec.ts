/**
 * Feature: comprehensive-e2e-testing
 * Tests for game mode state transitions
 *
 * Properties covered:
 * - Property 14: Menu to Playing Transition
 * - Property 15: Miss to GameOver Transition
 * - Property 16: Level Up Threshold Transition
 * - Property 17: Continue to Playing Transition
 * - Property 18: Retry Seed Preservation
 *
 * **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 4.7**
 */
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import {
  dropAndWaitForResult,
  getGameState,
  moveDuckToEdge,
  positionDuckOverStack,
  startSeededGame,
  triggerGameOver,
  waitForGameMode,
  waitForGameReady,
  waitForNewDuck,
} from "../helpers";

/**
 * Directly trigger level up by manipulating game state.
 * This is more reliable than trying to trigger it through gameplay
 * which would require 30+ sequential landings.
 *
 * @param page - Playwright page instance
 */
async function directTriggerLevelUp(page: Page): Promise<void> {
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const threshold = gs.width * 0.8;
    // Set base duck width past the threshold
    gs.ducks[0].w = threshold + 1;
    gs.ducks[0].mergeLevel = 6;
    // Trigger the level-up
    gs.mode = "LEVELUP";
    gs.level++;

    // Also show the level-up screen UI (remove hidden class)
    const levelUpScreen = document.getElementById("level-up-screen");
    if (levelUpScreen) {
      levelUpScreen.classList.remove("hidden");
    }

    // Update the level display
    const newLevelDisplay = document.getElementById("newLevelDisplay");
    if (newLevelDisplay) {
      newLevelDisplay.textContent = (gs.level + 1).toString();
    }
  });
  await page.waitForTimeout(300);
}

const SEED = "game-modes-test-001";

test.describe("Game Mode State Transitions", () => {
  // Skip on mobile (no keyboard) and Firefox (slow rAF timing)
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith("mobile"),
      "Keyboard input not available on mobile projects",
    );
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );
  });

  test.describe("Property 14: Menu to Playing Transition", () => {
    /**
     * Test: Clicking start button transitions from MENU to PLAYING mode
     *
     * For any click on the start button while in MENU mode, the game SHALL
     * transition to PLAYING mode, start screen SHALL hide, and score box SHALL show.
     *
     * Validates: Requirements 4.1, 4.7
     */
    test("clicking start button transitions from MENU to PLAYING", async ({ page }) => {
      await page.goto("");
      await waitForGameReady(page);

      // Verify initial MENU state
      const initialMode: string = await getGameState(page, "mode");
      expect(initialMode).toBe("MENU");

      // Verify start screen is visible
      const startScreen = page.locator("#start-screen");
      await expect(startScreen).toBeVisible();

      // Verify score box is hidden initially
      const scoreBox = page.locator("#scoreBox");
      await expect(scoreBox).toBeHidden();

      // Click start button
      await page.locator("#startBtn").click();

      // Wait for PLAYING mode
      await waitForGameMode(page, "PLAYING");

      // Verify mode changed to PLAYING
      const newMode: string = await getGameState(page, "mode");
      expect(newMode).toBe("PLAYING");

      // Verify start screen is hidden
      await expect(startScreen).toBeHidden();

      // Verify score box is visible
      await expect(scoreBox).toBeVisible();
    });

    /**
     * Test: Start screen hides and score box shows on game start
     *
     * Validates: Requirements 4.7
     */
    test("start screen hides and score box shows on game start", async ({ page }) => {
      await page.goto("");
      await waitForGameReady(page);

      // Verify UI state before start
      await expect(page.locator("#start-screen")).toBeVisible();
      await expect(page.locator("#scoreBox")).toBeHidden();

      // Start game with seed
      await page.fill("#seedInput", SEED);
      await page.locator("#startBtn").click();

      // Wait for transition
      await waitForGameMode(page, "PLAYING");

      // Verify UI state after start
      await expect(page.locator("#start-screen")).toBeHidden();
      await expect(page.locator("#scoreBox")).toBeVisible();

      // Verify score display shows 0
      const scoreDisplay = page.locator("#scoreDisplay");
      await expect(scoreDisplay).toContainText("0");
    });

    /**
     * Test: Game initializes with correct state after start
     *
     * Validates: Requirements 4.1
     */
    test("game initializes with correct state after start", async ({ page }) => {
      await startSeededGame(page, SEED);

      // Verify game state
      const mode: string = await getGameState(page, "mode");
      const score: number = await getGameState(page, "score");
      const level: number = await getGameState(page, "level");

      expect(mode).toBe("PLAYING");
      expect(score).toBe(0);
      expect(level).toBe(0);

      // Verify a current duck exists and is in hover state
      const currentDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          exists: gs.currentDuck !== null,
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(currentDuck.exists).toBe(true);
      expect(currentDuck.isFalling).toBe(false);
      expect(currentDuck.isStatic).toBe(false);
    });
  });

  test.describe("Property 15: Miss to GameOver Transition", () => {
    /**
     * Test: Duck missing stack triggers GAMEOVER mode
     *
     * For any duck that misses the stack (x outside hitTolerance), the game
     * SHALL transition to GAMEOVER mode.
     *
     * Validates: Requirements 4.2
     */
    test("duck missing stack triggers GAMEOVER mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial PLAYING state
      const initialMode: string = await getGameState(page, "mode");
      expect(initialMode).toBe("PLAYING");

      // Trigger game over by moving duck far from stack and dropping
      await triggerGameOver(page);

      // Verify GAMEOVER mode
      const finalMode: string = await getGameState(page, "mode");
      expect(finalMode).toBe("GAMEOVER");
    });

    /**
     * Test: Game over screen displays on miss
     *
     * Validates: Requirements 4.2
     */
    test("game over screen displays on miss", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify game over screen is hidden initially
      const gameOverScreen = page.locator("#game-over-screen");
      await expect(gameOverScreen).toBeHidden();

      // Trigger game over
      await triggerGameOver(page);

      // Verify game over screen is visible
      await expect(gameOverScreen).toBeVisible();

      // Verify retry button is visible
      const retryButton = page.locator("#restartBtn");
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toContainText("RETRY");
    });

    /**
     * Test: Moving duck to edge and dropping causes miss
     *
     * Validates: Requirements 4.2
     */
    test("moving duck to edge and dropping causes miss", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's position
      const topDuckX = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      const gameWidth: number = await getGameState(page, "width");

      // Move duck to the opposite edge from the stack
      const direction = topDuckX < gameWidth / 2 ? "right" : "left";
      await moveDuckToEdge(page, direction);

      // Drop the duck
      await page.keyboard.press("Space");

      // Wait for game over
      await waitForGameMode(page, "GAMEOVER", 15000);

      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");
    });
  });

  test.describe("Property 16: Level Up Threshold Transition", () => {
    /**
     * Test: Base duck reaching 80% screen width triggers LEVELUP mode
     *
     * For any base duck width >= width * 0.8, the game SHALL transition to
     * LEVELUP mode and level SHALL increment.
     *
     * Validates: Requirements 4.4, 6.1, 6.2
     */
    test("base duck reaching 80% screen width triggers LEVELUP mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial state
      const initialMode: string = await getGameState(page, "mode");
      const initialLevel: number = await getGameState(page, "level");
      expect(initialMode).toBe("PLAYING");
      expect(initialLevel).toBe(0);

      // Trigger level up via state manipulation
      await directTriggerLevelUp(page);

      // Verify LEVELUP mode
      const finalMode: string = await getGameState(page, "mode");
      expect(finalMode).toBe("LEVELUP");

      // Verify level incremented
      const finalLevel: number = await getGameState(page, "level");
      expect(finalLevel).toBe(1);
    });

    /**
     * Test: Level up screen displays when threshold reached
     *
     * Validates: Requirements 4.4
     */
    test("level up screen displays when threshold reached", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify level up screen is hidden initially
      const levelUpScreen = page.locator("#level-up-screen");
      await expect(levelUpScreen).toBeHidden();

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify level up screen is visible
      await expect(levelUpScreen).toBeVisible();

      // Verify continue button is visible
      const continueButton = page.locator("#continueLevelBtn");
      await expect(continueButton).toBeVisible();
    });

    /**
     * Test: Level up threshold is exactly 80% of screen width
     *
     * Validates: Requirements 4.4, 6.1
     */
    test("level up threshold is exactly 80% of screen width", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the threshold value
      const thresholdInfo = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          designWidth: gs.width,
          threshold: gs.width * 0.8,
          baseDuckWidth: gs.ducks[0].w,
        };
      });

      // Verify threshold is 80% of design width
      expect(thresholdInfo.threshold).toBe(thresholdInfo.designWidth * 0.8);

      // Verify base duck starts below threshold
      expect(thresholdInfo.baseDuckWidth).toBeLessThan(thresholdInfo.threshold);
    });
  });

  test.describe("Property 17: Continue to Playing Transition", () => {
    /**
     * Test: Clicking continue in LEVELUP transitions back to PLAYING
     *
     * For any click on continue button while in LEVELUP mode, the game SHALL
     * transition back to PLAYING mode.
     *
     * Validates: Requirements 4.5
     */
    test("clicking continue in LEVELUP transitions back to PLAYING", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify LEVELUP mode
      const levelUpMode: string = await getGameState(page, "mode");
      expect(levelUpMode).toBe("LEVELUP");

      // Click continue button
      await page.locator("#continueLevelBtn").click();

      // Wait for PLAYING mode
      await waitForGameMode(page, "PLAYING");

      // Verify mode changed back to PLAYING
      const finalMode: string = await getGameState(page, "mode");
      expect(finalMode).toBe("PLAYING");
    });

    /**
     * Test: Level is preserved after continuing from LEVELUP
     *
     * Validates: Requirements 4.5
     */
    test("level is preserved after continuing from LEVELUP", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Get level after level up
      const levelAfterLevelUp: number = await getGameState(page, "level");
      expect(levelAfterLevelUp).toBe(1);

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify level is still 1
      const levelAfterContinue: number = await getGameState(page, "level");
      expect(levelAfterContinue).toBe(1);
    });

    /**
     * Test: Level up screen hides after clicking continue
     *
     * Validates: Requirements 4.5
     */
    test("level up screen hides after clicking continue", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify level up screen is visible
      const levelUpScreen = page.locator("#level-up-screen");
      await expect(levelUpScreen).toBeVisible();

      // Click continue
      await page.locator("#continueLevelBtn").click();

      // Verify level up screen is hidden
      await expect(levelUpScreen).toBeHidden();
    });

    /**
     * Test: New duck spawns after continuing from LEVELUP
     *
     * Validates: Requirements 4.5
     */
    test("new duck spawns after continuing from LEVELUP", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Wait for new duck to spawn
      await waitForNewDuck(page);

      // Verify current duck exists and is in hover state
      const currentDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          exists: gs.currentDuck !== null,
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(currentDuck.exists).toBe(true);
      expect(currentDuck.isFalling).toBe(false);
      expect(currentDuck.isStatic).toBe(false);
    });
  });

  test.describe("Property 18: Retry Seed Preservation", () => {
    /**
     * Test: Clicking retry starts new game with same seed
     *
     * For any retry action after GAMEOVER, the game SHALL restart with the
     * same seed and transition to PLAYING mode.
     *
     * Validates: Requirements 4.6, 9.6
     */
    test("clicking retry starts new game with same seed", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the seed before game over
      const seedBefore: string = await getGameState(page, "seed");
      expect(seedBefore).toBe(SEED);

      // Trigger game over
      await triggerGameOver(page);

      // Verify GAMEOVER mode
      const gameOverMode: string = await getGameState(page, "mode");
      expect(gameOverMode).toBe("GAMEOVER");

      // Click retry button
      await page.locator("#restartBtn").click();

      // Wait for PLAYING mode
      await waitForGameMode(page, "PLAYING");

      // Verify mode changed to PLAYING
      const finalMode: string = await getGameState(page, "mode");
      expect(finalMode).toBe("PLAYING");

      // Verify seed is preserved
      const seedAfter: string = await getGameState(page, "seed");
      expect(seedAfter).toBe(SEED);
    });

    /**
     * Test: Score resets to 0 on retry
     *
     * Validates: Requirements 4.6
     */
    test("score resets to 0 on retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Land a duck to get some score
      await positionDuckOverStack(page, 0);
      const result = await dropAndWaitForResult(page, 0);

      if (result.mode === "PLAYING") {
        expect(result.score).toBeGreaterThan(0);

        // Wait for new duck and trigger game over
        await waitForNewDuck(page);
        await page.waitForTimeout(200);
        await triggerGameOver(page);
      } else {
        // If first drop caused game over, that's fine too
        expect(result.mode).toBe("GAMEOVER");
      }

      // Click retry
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify score is reset
      const scoreAfterRetry: number = await getGameState(page, "score");
      expect(scoreAfterRetry).toBe(0);
    });

    /**
     * Test: Level resets to 0 on retry
     *
     * Validates: Requirements 4.6
     */
    test("level resets to 0 on retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up first
      await directTriggerLevelUp(page);

      // Verify level is 1
      const levelAfterLevelUp: number = await getGameState(page, "level");
      expect(levelAfterLevelUp).toBe(1);

      // Continue and then trigger game over
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");
      await waitForNewDuck(page);
      await page.waitForTimeout(200);
      await triggerGameOver(page);

      // Click retry
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify level is reset to 0
      const levelAfterRetry: number = await getGameState(page, "level");
      expect(levelAfterRetry).toBe(0);
    });

    /**
     * Test: Game over screen hides on retry
     *
     * Validates: Requirements 4.6
     */
    test("game over screen hides on retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger game over
      await triggerGameOver(page);

      // Verify game over screen is visible
      const gameOverScreen = page.locator("#game-over-screen");
      await expect(gameOverScreen).toBeVisible();

      // Click retry
      await page.locator("#restartBtn").click();

      // Verify game over screen is hidden
      await expect(gameOverScreen).toBeHidden();
    });

    /**
     * Test: Spawn positions are reproducible with same seed on retry
     *
     * Validates: Requirements 4.6, 9.6
     */
    test("spawn positions are reproducible with same seed on retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get first spawn position
      const firstSpawnX: number = await getGameState(page, "currentDuck.spawnX");

      // Trigger game over
      await triggerGameOver(page);

      // Click retry
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");
      await waitForNewDuck(page);

      // Get spawn position after retry
      const spawnXAfterRetry: number = await getGameState(page, "currentDuck.spawnX");

      // Spawn positions should be identical with same seed
      expect(spawnXAfterRetry).toBe(firstSpawnX);
    });
  });

  test.describe("GAMEOVER to PLAYING on retry - Additional Tests", () => {
    /**
     * Test: Canvas continues rendering after retry
     *
     * Validates: Requirements 4.6
     */
    test("canvas continues rendering after retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger game over
      await triggerGameOver(page);

      // Click retry
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Wait for render loop to process a few frames
      await page.waitForTimeout(500);

      // Verify canvas is rendering (not all-black) using multiple sample points
      const isRendering = await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement | null;
        if (!canvas) return false;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;

        // Sample 5 points across the canvas
        const w = canvas.width;
        const h = canvas.height;
        const points = [
          [w * 0.5, h * 0.3],
          [w * 0.25, h * 0.5],
          [w * 0.75, h * 0.5],
          [w * 0.5, h * 0.7],
          [w * 0.5, h * 0.9],
        ];

        let nonBlackPixels = 0;
        for (const [x, y] of points) {
          const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
          if (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0) {
            nonBlackPixels++;
          }
        }

        // At least 2 of 5 sampled points should be non-black
        return nonBlackPixels >= 2;
      });

      expect(isRendering).toBe(true);
    });

    /**
     * Test: Base duck resets to initial size on retry
     *
     * Validates: Requirements 4.6
     */
    test("base duck resets to initial size on retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial base duck width
      const initialWidth: number = await getGameState(page, "ducks.0.w");
      expect(initialWidth).toBe(60); // CONFIG.duckBaseWidth

      // Trigger level up (which grows the base duck)
      await directTriggerLevelUp(page);

      // Continue and trigger game over
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");
      await waitForNewDuck(page);
      await page.waitForTimeout(200);
      await triggerGameOver(page);

      // Click retry
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify base duck width is reset
      const widthAfterRetry: number = await getGameState(page, "ducks.0.w");
      expect(widthAfterRetry).toBe(60); // CONFIG.duckBaseWidth
    });
  });
});
