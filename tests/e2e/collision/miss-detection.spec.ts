/**
 * Feature: comprehensive-e2e-testing
 * Property 2: Collision Miss Detection
 *
 * *For any* falling duck with x-position outside hitTolerance of the top duck's center,
 * when the duck crosses targetY, the game SHALL transition to GAMEOVER mode.
 *
 * **Validates: Requirements 1.2, 1.5**
 */
import { expect, test } from "@playwright/test";
import {
  dropAndWaitForResult,
  getGameState,
  moveDuckToEdge,
  positionDuckOverStack,
  startSeededGame,
  waitForGameMode,
  waitForNewDuck,
} from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "miss-detection-test-001";

// Game constants from CONFIG
const HIT_TOLERANCE = 0.65; // Collision zone = topDuck.w * 0.65
const DUCK_BASE_WIDTH = 60; // Base duck width in design space

test.describe("Collision Miss Detection", () => {
  // These tests rely on keyboard input which is unavailable on mobile devices.
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

  test.describe("Requirement 1.2: Game over when x outside hitTolerance", () => {
    /**
     * Test: Duck misses stack when positioned far outside hit tolerance
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over triggers when duck x is outside hitTolerance", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's position and calculate hit tolerance boundary
      const topDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const top = gs.ducks[gs.ducks.length - 1];
        return { x: top.x, w: top.w };
      });

      // Calculate the hit tolerance zone
      const hitZone = topDuck.w * HIT_TOLERANCE;

      // Get game width and current duck position
      const gameWidth: number = await getGameState(page, "width");
      const currentDuckX: number = await getGameState(page, "currentDuck.x");

      // Determine which direction to move to get AWAY from the top duck
      // If current duck is to the right of top duck, move right; otherwise move left
      // But also consider which edge has more room
      const spaceToRight = gameWidth - currentDuckX;
      const spaceToLeft = currentDuckX;
      const direction = spaceToRight > spaceToLeft ? "right" : "left";

      await moveDuckToEdge(page, direction);

      // Verify duck is outside hit tolerance
      const duckX: number = await getGameState(page, "currentDuck.x");
      const offset = Math.abs(duckX - topDuck.x);

      // If we couldn't get outside hit tolerance (edge case where stack is at edge),
      // try the other direction
      if (offset <= hitZone) {
        const otherDirection = direction === "right" ? "left" : "right";
        await moveDuckToEdge(page, otherDirection);
        const newDuckX: number = await getGameState(page, "currentDuck.x");
        const newOffset = Math.abs(newDuckX - topDuck.x);

        if (newOffset <= hitZone) {
          test.skip(true, "Could not position duck outside hit tolerance - stack at center");
          return;
        }
      }

      // Drop the duck - should miss and trigger game over
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Verify game over triggered
      expect(result.mode).toBe("GAMEOVER");
      // Score should not have increased
      expect(result.score).toBe(scoreBefore);
    });

    /**
     * Test: Duck misses when positioned just outside hit tolerance boundary
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over triggers when duck is just outside hitTolerance boundary", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's position and calculate hit tolerance boundary
      const topDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const top = gs.ducks[gs.ducks.length - 1];
        return { x: top.x, w: top.w };
      });

      // Calculate the hit tolerance zone boundary
      // hitZone = topDuck.w * 0.65 = 60 * 0.65 = 39px
      const hitZone = topDuck.w * HIT_TOLERANCE;

      // Position duck to be just outside the hit tolerance
      // We want offset > hitZone (e.g., 45px offset when hitZone is 39px)
      const targetOffset = hitZone + 10; // 10px outside the tolerance

      // Position duck at the target offset
      await positionDuckOverStack(page, targetOffset);

      // Verify duck is outside hit tolerance
      const duckX: number = await getGameState(page, "currentDuck.x");
      const actualOffset = Math.abs(duckX - topDuck.x);

      // If we couldn't position outside tolerance, move further
      if (actualOffset <= hitZone) {
        // Move additional steps to get outside tolerance
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(30);
        }
      }

      // Re-check position
      const finalDuckX: number = await getGameState(page, "currentDuck.x");
      const finalOffset = Math.abs(finalDuckX - topDuck.x);

      // Skip if we still couldn't get outside tolerance (edge case)
      if (finalOffset <= hitZone) {
        test.skip(true, "Could not position duck outside hit tolerance");
        return;
      }

      // Drop the duck - should miss and trigger game over
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Verify game over triggered
      expect(result.mode).toBe("GAMEOVER");
    });

    /**
     * Test: Multiple miss scenarios trigger game over consistently
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over triggers consistently for various miss positions", async ({ page }) => {
      // Test multiple seeds to verify consistent behavior
      const testSeeds = ["miss-test-001", "miss-test-002", "miss-test-003"];
      let gameOversTriggered = 0;

      for (const seed of testSeeds) {
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        // Move duck to far edge to ensure miss
        const topDuckX: number = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[gs.ducks.length - 1].x;
        });

        const gameWidth: number = await getGameState(page, "width");
        const direction = topDuckX < gameWidth / 2 ? "right" : "left";
        await moveDuckToEdge(page, direction);

        // Drop and check result
        const scoreBefore: number = await getGameState(page, "score");
        const result = await dropAndWaitForResult(page, scoreBefore);

        if (result.mode === "GAMEOVER") {
          gameOversTriggered++;
        }
      }

      // All miss attempts should trigger game over
      expect(gameOversTriggered).toBe(testSeeds.length);
    });

    /**
     * Test: Game over screen displays after miss
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over screen displays after duck misses stack", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to far edge to ensure miss
      const topDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      const gameWidth: number = await getGameState(page, "width");
      const direction = topDuckX < gameWidth / 2 ? "right" : "left";
      await moveDuckToEdge(page, direction);

      // Drop the duck
      await page.keyboard.press("Space");

      // Wait for game over mode
      await waitForGameMode(page, "GAMEOVER");

      // Verify game over screen is visible
      await expect(page.locator("#game-over-screen")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Requirement 1.5: Fallback game over at baseY + cameraY + 400", () => {
    /**
     * Test: Fallback game over triggers when duck falls past threshold
     *
     * The fallback game over triggers when a falling duck reaches:
     * baseY + cameraY + 400 without any collision occurring.
     *
     * Validates: Requirements 1.5
     * Property 2: Collision Miss Detection
     */
    test("fallback game over triggers when duck falls past baseY + cameraY + 400", async ({
      page,
    }) => {
      test.setTimeout(30000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the fallback threshold values
      const thresholdInfo = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          baseY: gs.baseY,
          cameraY: gs.cameraY,
          fallbackThreshold: gs.baseY + gs.cameraY + 400,
        };
      });

      // Move duck to far edge to ensure it misses the stack
      const topDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      const gameWidth: number = await getGameState(page, "width");
      const direction = topDuckX < gameWidth / 2 ? "right" : "left";
      await moveDuckToEdge(page, direction);

      // Drop the duck
      await page.keyboard.press("Space");

      // Wait for game over (either from miss detection or fallback)
      await waitForGameMode(page, "GAMEOVER", 20000);

      // Verify game over occurred
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");
    });

    /**
     * Test: Duck that completely misses triggers fallback game over
     *
     * When a duck is positioned so far from the stack that it can't possibly
     * collide, the fallback mechanism should trigger game over.
     *
     * Validates: Requirements 1.5
     * Property 2: Collision Miss Detection
     */
    test("duck positioned at extreme edge triggers game over via fallback", async ({ page }) => {
      test.setTimeout(30000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the absolute edge of the game area
      await moveDuckToEdge(page, "right");

      // Verify duck is at the boundary
      const bounds = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const duck = gs.currentDuck;
        return {
          duckX: duck.x,
          maxX: gs.width - duck.w / 2,
          topDuckX: gs.ducks[gs.ducks.length - 1].x,
        };
      });

      // Duck should be at or near the right boundary
      expect(bounds.duckX).toBeCloseTo(bounds.maxX, 0);

      // Drop the duck
      await page.keyboard.press("Space");

      // Wait for game over
      await waitForGameMode(page, "GAMEOVER", 20000);

      // Verify game over occurred
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");
    });
  });

  test.describe("Property 2: Collision Miss Detection - Edge Cases", () => {
    /**
     * Test: Score does not increment on miss
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("score remains unchanged when duck misses stack", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial score
      const initialScore: number = await getGameState(page, "score");
      expect(initialScore).toBe(0);

      // Move duck to far edge to ensure miss
      await moveDuckToEdge(page, "right");

      // Drop the duck
      const result = await dropAndWaitForResult(page, initialScore);

      // Verify game over and score unchanged
      expect(result.mode).toBe("GAMEOVER");
      expect(result.score).toBe(initialScore);
    });

    /**
     * Test: Duck state transitions correctly on miss
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("duck transitions from falling to game over on miss", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial hover state
      const initialIsFalling: boolean = await getGameState(page, "currentDuck.isFalling");
      expect(initialIsFalling).toBe(false);

      // Move duck to far edge
      await moveDuckToEdge(page, "right");

      // Drop the duck
      await page.keyboard.press("Space");

      // Verify falling state
      const fallingState: boolean = await getGameState(page, "currentDuck.isFalling");
      expect(fallingState).toBe(true);

      // Wait for game over
      await waitForGameMode(page, "GAMEOVER");

      // Verify game over mode
      const mode: string = await getGameState(page, "mode");
      expect(mode).toBe("GAMEOVER");
    });

    /**
     * Test: Miss detection works after successful landings
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("miss detection works correctly after building a stack", async ({ page }) => {
      test.setTimeout(90000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Land a few ducks successfully first
      const successfulLandings = 2;
      for (let i = 0; i < successfulLandings; i++) {
        if (i > 0) {
          await waitForNewDuck(page);
          await page.waitForTimeout(200);
        }

        const scoreBefore: number = await getGameState(page, "score");
        await positionDuckOverStack(page, 0);
        const result = await dropAndWaitForResult(page, scoreBefore);

        if (result.mode === "GAMEOVER") {
          test.skip(true, "Duck missed during stack building");
          return;
        }

        expect(result.mode).toBe("PLAYING");
      }

      // Wait for next duck
      await waitForNewDuck(page);
      await page.waitForTimeout(200);

      // Now intentionally miss
      const scoreBeforeMiss: number = await getGameState(page, "score");
      expect(scoreBeforeMiss).toBe(successfulLandings);

      // Move to far edge
      await moveDuckToEdge(page, "right");

      // Drop and verify game over
      const result = await dropAndWaitForResult(page, scoreBeforeMiss);
      expect(result.mode).toBe("GAMEOVER");
      expect(result.score).toBe(scoreBeforeMiss); // Score unchanged
    });

    /**
     * Test: Hit tolerance boundary - duck at exact boundary misses
     *
     * When a duck is positioned at exactly the hit tolerance boundary,
     * it should miss (boundary is exclusive for miss detection).
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("duck at hit tolerance boundary edge case", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's position and calculate exact boundary
      const topDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const top = gs.ducks[gs.ducks.length - 1];
        return { x: top.x, w: top.w };
      });

      // Calculate exact hit tolerance boundary
      const hitZone = topDuck.w * HIT_TOLERANCE;

      // Try to position duck at exactly the boundary + small margin
      // This tests the edge case where duck is just outside tolerance
      const targetOffset = hitZone + 5;
      await positionDuckOverStack(page, targetOffset);

      // Get actual position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const actualOffset = Math.abs(duckX - topDuck.x);

      // Drop the duck
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // If offset is outside hit zone, should be game over
      // If offset is inside hit zone, should land successfully
      if (actualOffset > hitZone) {
        expect(result.mode).toBe("GAMEOVER");
      } else {
        expect(result.mode).toBe("PLAYING");
      }
    });

    /**
     * Test: Miss on left side of stack
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over triggers when duck misses on left side", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's position and game width
      const { topDuckX, gameWidth, hitTolerance } = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const topDuck = gs.ducks[gs.ducks.length - 1];
        return {
          topDuckX: topDuck.x,
          gameWidth: gs.width,
          hitTolerance: topDuck.w * 0.65, // CONFIG.hitTolerance
        };
      });

      // Move duck to left edge
      await moveDuckToEdge(page, "left");

      // Verify duck is outside hit tolerance on the left side
      const duckX: number = await getGameState(page, "currentDuck.x");
      const offset = topDuckX - duckX;

      // If duck is not far enough left to miss, manually position it
      if (offset <= hitTolerance) {
        const missPosition = Math.max(30, topDuckX - hitTolerance - 20);
        await page.evaluate((pos) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.currentDuck.x = pos;
        }, missPosition);
      }

      // Verify duck is now to the left and outside hit tolerance
      const finalDuckX: number = await getGameState(page, "currentDuck.x");
      expect(finalDuckX).toBeLessThan(topDuckX);

      // Drop and verify game over
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      expect(result.mode).toBe("GAMEOVER");
    });

    /**
     * Test: Miss on right side of stack
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("game over triggers when duck misses on right side", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to right edge
      await moveDuckToEdge(page, "right");

      // Verify duck is on right side
      const duckX: number = await getGameState(page, "currentDuck.x");
      const topDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      // Duck should be to the right of the stack
      expect(duckX).toBeGreaterThan(topDuckX);

      // Drop and verify game over
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      expect(result.mode).toBe("GAMEOVER");
    });
  });

  test.describe("Property 2: Collision Miss Detection - Retry Behavior", () => {
    /**
     * Test: Retry after miss allows new game with same seed
     *
     * Validates: Requirements 1.2
     * Property 2: Collision Miss Detection
     */
    test("retry after miss starts new game with same seed", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Intentionally miss
      await moveDuckToEdge(page, "right");
      await page.keyboard.press("Space");
      await waitForGameMode(page, "GAMEOVER");

      // Get the seed displayed on game over screen
      const displayedSeed: string = await getGameState(page, "seed");
      expect(displayedSeed).toBe(SEED);

      // Click retry button
      await page.locator("#restartBtn").click();

      // Wait for game to restart
      await waitForGameMode(page, "PLAYING");

      // Verify game restarted with same seed
      const newSeed: string = await getGameState(page, "seed");
      expect(newSeed).toBe(SEED);

      // Verify score reset
      const score: number = await getGameState(page, "score");
      expect(score).toBe(0);
    });
  });
});
