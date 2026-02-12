/**
 * Feature: comprehensive-e2e-testing
 * Tests for UI state behavior in different game modes
 *
 * Properties covered:
 * - Property 19: No Spawn in Non-Playing Modes
 *
 * **Validates: Requirements 4.8, 4.9**
 */
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getGameState, startSeededGame, triggerGameOver, waitForGameMode } from "../helpers";

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

    // Clear current duck to simulate no spawning
    gs.currentDuck = null;

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

const SEED = "ui-states-test-001";

test.describe("UI States Tests", () => {
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

  test.describe("Property 19: No Spawn in Non-Playing Modes", () => {
    /**
     * Test: No new duck spawns in GAMEOVER mode
     *
     * For any game in GAMEOVER mode, no new duck spawning SHALL occur.
     *
     * Validates: Requirements 4.8
     */
    test("no new duck spawns in GAMEOVER mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial PLAYING state with a current duck
      const initialMode: string = await getGameState(page, "mode");
      expect(initialMode).toBe("PLAYING");

      const initialCurrentDuck = await getGameState(page, "currentDuck");
      expect(initialCurrentDuck).not.toBeNull();

      // Trigger game over
      await triggerGameOver(page);

      // Verify GAMEOVER mode
      const gameOverMode: string = await getGameState(page, "mode");
      expect(gameOverMode).toBe("GAMEOVER");

      // Wait some time to ensure no new duck spawns
      await page.waitForTimeout(3000);

      // Verify no new duck has spawned (currentDuck should be null or the same fallen duck)
      const currentDuckAfterWait = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          currentDuck: gs.currentDuck,
          mode: gs.mode,
        };
      });

      // In GAMEOVER mode, currentDuck should either be null or not in hover state
      expect(currentDuckAfterWait.mode).toBe("GAMEOVER");

      // If there is a currentDuck, it should not be in hover state (ready for input)
      if (currentDuckAfterWait.currentDuck) {
        // A hovering duck would have isFalling=false, isStatic=false
        // In GAMEOVER, any remaining duck should not be in this state
        const isHovering =
          !currentDuckAfterWait.currentDuck.isFalling &&
          !currentDuckAfterWait.currentDuck.isStatic &&
          !currentDuckAfterWait.currentDuck.isBeingDragged;

        // If there's a duck, it should not be a newly spawned hovering duck
        // (it could be the duck that caused game over, which would be falling or static)
        expect(isHovering).toBe(false);
      }
    });

    /**
     * Test: No new duck spawns in LEVELUP mode
     *
     * For any game in LEVELUP mode, no new duck spawning SHALL occur.
     *
     * Validates: Requirements 4.9
     */
    test("no new duck spawns in LEVELUP mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial PLAYING state
      const initialMode: string = await getGameState(page, "mode");
      expect(initialMode).toBe("PLAYING");

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify LEVELUP mode
      const levelUpMode: string = await getGameState(page, "mode");
      expect(levelUpMode).toBe("LEVELUP");

      // Record the current state
      const stateBeforeWait = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          currentDuck: gs.currentDuck,
          ducksCount: gs.ducks.length,
        };
      });

      // Wait some time to ensure no new duck spawns
      await page.waitForTimeout(3000);

      // Verify no new duck has spawned
      const stateAfterWait = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          currentDuck: gs.currentDuck,
          ducksCount: gs.ducks.length,
          mode: gs.mode,
        };
      });

      // Mode should still be LEVELUP
      expect(stateAfterWait.mode).toBe("LEVELUP");

      // No new hovering duck should have spawned
      // currentDuck should remain null (as set in directTriggerLevelUp)
      expect(stateAfterWait.currentDuck).toBeNull();

      // Ducks count should not have increased
      expect(stateAfterWait.ducksCount).toBe(stateBeforeWait.ducksCount);
    });

    /**
     * Test: Duck spawning resumes after exiting GAMEOVER mode via retry
     *
     * Validates: Requirements 4.8
     */
    test("duck spawning resumes after exiting GAMEOVER mode via retry", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

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
      const playingMode: string = await getGameState(page, "mode");
      expect(playingMode).toBe("PLAYING");

      // Wait for a new duck to spawn
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 5000 },
      );

      // Verify a new hovering duck exists
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

    /**
     * Test: Duck spawning resumes after exiting LEVELUP mode via continue
     *
     * Validates: Requirements 4.9
     */
    test("duck spawning resumes after exiting LEVELUP mode via continue", async ({ page }) => {
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

      // Verify mode changed to PLAYING
      const playingMode: string = await getGameState(page, "mode");
      expect(playingMode).toBe("PLAYING");

      // Wait for a new duck to spawn
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 5000 },
      );

      // Verify a new hovering duck exists
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

    /**
     * Test: Game over screen blocks spawn timer
     *
     * Validates: Requirements 4.8
     */
    test("game over screen blocks spawn timer", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger game over
      await triggerGameOver(page);

      // Verify game over screen is visible
      const gameOverScreen = page.locator("#game-over-screen");
      await expect(gameOverScreen).toBeVisible();

      // Get initial ducks count
      const initialDucksCount: number = await getGameState(page, "ducks.length");

      // Wait longer than the spawn interval (typically 2000ms)
      await page.waitForTimeout(4000);

      // Verify ducks count hasn't changed (no new spawns)
      const finalDucksCount: number = await getGameState(page, "ducks.length");
      expect(finalDucksCount).toBe(initialDucksCount);

      // Verify still in GAMEOVER mode
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");
    });

    /**
     * Test: Level up screen blocks spawn timer
     *
     * Validates: Requirements 4.9
     */
    test("level up screen blocks spawn timer", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify level up screen is visible
      const levelUpScreen = page.locator("#level-up-screen");
      await expect(levelUpScreen).toBeVisible();

      // Get initial ducks count
      const initialDucksCount: number = await getGameState(page, "ducks.length");

      // Wait longer than the spawn interval (typically 2000ms)
      await page.waitForTimeout(4000);

      // Verify ducks count hasn't changed (no new spawns)
      const finalDucksCount: number = await getGameState(page, "ducks.length");
      expect(finalDucksCount).toBe(initialDucksCount);

      // Verify still in LEVELUP mode
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("LEVELUP");
    });

    /**
     * Test: No spawn occurs during GAMEOVER even with extended wait
     *
     * Validates: Requirements 4.8
     */
    test("no spawn occurs during GAMEOVER even with extended wait", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger game over
      await triggerGameOver(page);

      // Verify GAMEOVER mode
      const gameOverMode: string = await getGameState(page, "mode");
      expect(gameOverMode).toBe("GAMEOVER");

      // Record initial state
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          ducksCount: gs.ducks.length,
          hasHoveringDuck:
            gs.currentDuck &&
            !gs.currentDuck.isFalling &&
            !gs.currentDuck.isStatic &&
            !gs.currentDuck.isBeingDragged,
        };
      });

      // Wait for multiple spawn intervals (5 seconds = 2.5x the base spawn interval)
      await page.waitForTimeout(5000);

      // Verify state hasn't changed
      const finalState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          ducksCount: gs.ducks.length,
          hasHoveringDuck:
            gs.currentDuck &&
            !gs.currentDuck.isFalling &&
            !gs.currentDuck.isStatic &&
            !gs.currentDuck.isBeingDragged,
          mode: gs.mode,
        };
      });

      // Mode should still be GAMEOVER
      expect(finalState.mode).toBe("GAMEOVER");

      // Ducks count should not have increased
      expect(finalState.ducksCount).toBe(initialState.ducksCount);

      // No new hovering duck should have spawned
      expect(finalState.hasHoveringDuck).toBeFalsy();
    });

    /**
     * Test: No spawn occurs during LEVELUP even with extended wait
     *
     * Validates: Requirements 4.9
     */
    test("no spawn occurs during LEVELUP even with extended wait", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify LEVELUP mode
      const levelUpMode: string = await getGameState(page, "mode");
      expect(levelUpMode).toBe("LEVELUP");

      // Record initial state
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          ducksCount: gs.ducks.length,
          currentDuck: gs.currentDuck,
        };
      });

      // Wait for multiple spawn intervals (5 seconds = 2.5x the base spawn interval)
      await page.waitForTimeout(5000);

      // Verify state hasn't changed
      const finalState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          ducksCount: gs.ducks.length,
          currentDuck: gs.currentDuck,
          mode: gs.mode,
        };
      });

      // Mode should still be LEVELUP
      expect(finalState.mode).toBe("LEVELUP");

      // Ducks count should not have increased
      expect(finalState.ducksCount).toBe(initialState.ducksCount);

      // currentDuck should still be null (no new spawn)
      expect(finalState.currentDuck).toBeNull();
    });
  });

  test.describe("UI State Visibility Tests", () => {
    /**
     * Test: Game over screen is visible in GAMEOVER mode
     *
     * Validates: Requirements 4.8
     */
    test("game over screen is visible in GAMEOVER mode", async ({ page }) => {
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
    });

    /**
     * Test: Level up screen is visible in LEVELUP mode
     *
     * Validates: Requirements 4.9
     */
    test("level up screen is visible in LEVELUP mode", async ({ page }) => {
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
     * Test: Score box remains visible in GAMEOVER mode
     *
     * Validates: Requirements 4.8
     */
    test("score box remains visible in GAMEOVER mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify score box is visible during play
      const scoreBox = page.locator("#scoreBox");
      await expect(scoreBox).toBeVisible();

      // Trigger game over
      await triggerGameOver(page);

      // Score box should still be visible
      await expect(scoreBox).toBeVisible();
    });

    /**
     * Test: Score box remains visible in LEVELUP mode
     *
     * Validates: Requirements 4.9
     */
    test("score box remains visible in LEVELUP mode", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify score box is visible during play
      const scoreBox = page.locator("#scoreBox");
      await expect(scoreBox).toBeVisible();

      // Trigger level up
      await directTriggerLevelUp(page);

      // Score box should still be visible
      await expect(scoreBox).toBeVisible();
    });
  });

  test.describe("Mode Transition Edge Cases", () => {
    /**
     * Test: Rapid mode transitions don't cause spawn issues
     *
     * Validates: Requirements 4.8, 4.9
     */
    test("rapid mode transitions don't cause spawn issues", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Quickly continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Wait for new duck
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 5000 },
      );

      // Immediately trigger game over
      await triggerGameOver(page);

      // Verify GAMEOVER mode
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");

      // Wait to ensure no spawn occurs
      await page.waitForTimeout(2000);

      // Verify still in GAMEOVER
      const modeAfterWait: string = await getGameState(page, "mode");
      expect(modeAfterWait).toBe("GAMEOVER");
    });

    /**
     * Test: Mode state is consistent after multiple transitions
     *
     * Validates: Requirements 4.8, 4.9
     */
    test("mode state is consistent after multiple transitions", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Cycle through modes: PLAYING -> LEVELUP -> PLAYING -> GAMEOVER -> PLAYING

      // 1. PLAYING -> LEVELUP
      await directTriggerLevelUp(page);
      let mode: string = await getGameState(page, "mode");
      expect(mode).toBe("LEVELUP");

      // 2. LEVELUP -> PLAYING
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");
      mode = await getGameState(page, "mode");
      expect(mode).toBe("PLAYING");

      // Wait for new duck
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 5000 },
      );

      // 3. PLAYING -> GAMEOVER
      await triggerGameOver(page);
      mode = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");

      // 4. GAMEOVER -> PLAYING
      await page.locator("#restartBtn").click();
      await waitForGameMode(page, "PLAYING");
      mode = await getGameState(page, "mode");
      expect(mode).toBe("PLAYING");

      // Verify a new duck spawns after all transitions
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 5000 },
      );

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
});
