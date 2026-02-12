import { expect, test } from "@playwright/test";
import { getGameState, startGame, waitForDuckLandingResult, waitForNewDuckResult } from "./helpers";

/**
 * Property-Based Tests for AI-Controlled Gameplay
 *
 * These tests verify universal properties that should hold across all valid
 * game states and scenarios.
 */

test.describe("Property Tests: Stuck Duck Detection", () => {
  // Set 30s timeout for all property tests
  test.beforeEach(async () => {
    test.setTimeout(30_000);
  });

  /**
   * Property 1: Stuck Duck Detection
   *
   * *For any* duck that is static but score didn't increase, the test helper
   * SHALL detect this as a "stuck" outcome and provide diagnostic information.
   *
   * **Validates: Requirements 1.5**
   *
   * This property test verifies that the waitForDuckLandingResult helper correctly
   * identifies stuck duck states by:
   * 1. Simulating a stuck duck state (static duck, no score increase)
   * 2. Verifying the helper returns outcome "stuck"
   * 3. Verifying diagnostic information is provided (duckState)
   */
  test("Property 1: waitForDuckLandingResult detects stuck duck state", async ({ page }) => {
    await page.goto("");
    await page.fill("#seedInput", "stuck-detection-property-test");
    await startGame(page);

    // Wait for initial duck to spawn
    const newDuckResult = await waitForNewDuckResult(page, 5000);
    expect(newDuckResult.success).toBe(true);

    // Get the current score before we simulate the stuck state
    const scoreBefore: number = await getGameState(page, "score");

    // Simulate a stuck duck state by:
    // 1. Setting the current duck to static (isStatic = true, isFalling = false)
    // 2. NOT incrementing the score
    // This simulates an edge case where a duck becomes static without triggering score
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      if (gs.currentDuck) {
        // Force the duck into a stuck state
        gs.currentDuck.isStatic = true;
        gs.currentDuck.isFalling = false;
        // Do NOT increment score - this is the key to triggering "stuck" detection
      }
    });

    // Now call waitForDuckLandingResult - it should detect the stuck state
    const result = await waitForDuckLandingResult(page, scoreBefore, 2000);

    // Property assertion: outcome should be "stuck"
    expect(result.outcome).toBe("stuck");

    // Property assertion: diagnostic information should be provided
    expect(result.duckState).toBeDefined();
    expect(result.duckState?.isStatic).toBe(true);
    expect(result.duckState?.isFalling).toBe(false);

    // Property assertion: score should not have changed
    expect(result.score).toBe(scoreBefore);

    // Property assertion: mode should still be PLAYING (not GAMEOVER)
    expect(result.mode).toBe("PLAYING");

    console.log("[Property 1] Stuck duck detection verified:", {
      outcome: result.outcome,
      score: result.score,
      mode: result.mode,
      duckState: result.duckState,
    });
  });

  /**
   * Property 1 (Variant A): Stuck detection with duck at various Y positions
   *
   * *For any* Y position where a duck becomes static without score increase,
   * the helper SHALL detect this as "stuck" and include the Y position in diagnostics.
   *
   * **Validates: Requirements 1.5**
   */
  test("Property 1A: stuck detection includes Y position in diagnostics", async ({ page }) => {
    await page.goto("");
    await page.fill("#seedInput", "stuck-y-position-test");
    await startGame(page);

    // Wait for initial duck to spawn
    const newDuckResult = await waitForNewDuckResult(page, 5000);
    expect(newDuckResult.success).toBe(true);

    // Get game dimensions to calculate valid Y positions within game area
    const gameHeight: number = await getGameState(page, "height");

    // Test with different Y positions within valid game area (not too low to trigger game over)
    // Use positions in the upper portion of the screen where ducks normally stack
    const testYPositions = [
      Math.floor(gameHeight * 0.1), // 10% from top
      Math.floor(gameHeight * 0.3), // 30% from top
      Math.floor(gameHeight * 0.5), // 50% from top (middle)
    ];

    for (const testY of testYPositions) {
      const scoreBefore: number = await getGameState(page, "score");

      // Set duck to stuck state at specific Y position
      // Also ensure game mode stays PLAYING (not GAMEOVER)
      await page.evaluate((y) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.isStatic = true;
          gs.currentDuck.isFalling = false;
          gs.currentDuck.y = y;
        }
        // Ensure mode stays PLAYING for this test
        gs.mode = "PLAYING";
      }, testY);

      const result = await waitForDuckLandingResult(page, scoreBefore, 1000);

      // Property assertion: Y position should be captured in diagnostics
      expect(result.outcome).toBe("stuck");
      expect(result.duckState).toBeDefined();
      expect(result.duckState?.y).toBe(testY);

      console.log(`[Property 1A] Stuck at Y=${testY} detected:`, result.duckState);

      // Reset duck state for next iteration
      await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.isStatic = false;
          gs.currentDuck.isFalling = true;
        }
      });

      // Small wait to let game state settle
      await page.waitForTimeout(50);
    }
  });

  /**
   * Property 1 (Variant B): Stuck detection distinguishes from successful landing
   *
   * *For any* duck that lands successfully (score increases), the helper SHALL
   * return "landed" NOT "stuck", even if the duck is static.
   *
   * **Validates: Requirements 1.5**
   */
  test("Property 1B: successful landing returns 'landed' not 'stuck'", async ({ page }) => {
    await page.goto("");
    await page.fill("#seedInput", "landed-vs-stuck-test");
    await startGame(page);

    // Wait for initial duck to spawn
    await waitForNewDuckResult(page, 5000);

    const scoreBefore: number = await getGameState(page, "score");

    // Simulate a successful landing: duck is static AND score increased
    await page.evaluate((prevScore) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      if (gs.currentDuck) {
        gs.currentDuck.isStatic = true;
        gs.currentDuck.isFalling = false;
      }
      // Increment score to simulate successful landing
      gs.score = prevScore + 1;
    }, scoreBefore);

    const result = await waitForDuckLandingResult(page, scoreBefore, 2000);

    // Property assertion: outcome should be "landed" (not "stuck") because score increased
    expect(result.outcome).toBe("landed");
    expect(result.score).toBeGreaterThan(scoreBefore);

    console.log("[Property 1B] Successful landing correctly identified:", {
      outcome: result.outcome,
      score: result.score,
      previousScore: scoreBefore,
    });
  });

  /**
   * Property 1 (Variant C): Stuck detection distinguishes from game over
   *
   * *For any* game over state, the helper SHALL return "gameover" NOT "stuck",
   * even if a duck is static without score increase.
   *
   * **Validates: Requirements 1.5**
   */
  test("Property 1C: game over returns 'gameover' not 'stuck'", async ({ page }) => {
    await page.goto("");
    await page.fill("#seedInput", "gameover-vs-stuck-test");
    await startGame(page);

    // Wait for initial duck to spawn
    await waitForNewDuckResult(page, 5000);

    const scoreBefore: number = await getGameState(page, "score");

    // Simulate game over state
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      gs.mode = "GAMEOVER";
      // Duck might still be in some state, but game over takes precedence
      if (gs.currentDuck) {
        gs.currentDuck.isStatic = true;
        gs.currentDuck.isFalling = false;
      }
    });

    const result = await waitForDuckLandingResult(page, scoreBefore, 2000);

    // Property assertion: outcome should be "gameover" (takes precedence over stuck)
    expect(result.outcome).toBe("gameover");
    expect(result.mode).toBe("GAMEOVER");

    console.log("[Property 1C] Game over correctly identified:", {
      outcome: result.outcome,
      mode: result.mode,
    });
  });

  /**
   * Property 1 (Variant D): Stuck detection with multiple seeds
   *
   * *For any* seed value, if a duck becomes stuck, the helper SHALL detect it.
   * This tests that stuck detection is seed-independent.
   *
   * **Validates: Requirements 1.5**
   */
  test("Property 1D: stuck detection works across different seeds", async ({ page }) => {
    const testSeeds = ["seed-alpha", "seed-beta", "seed-gamma", "seed-delta", "seed-epsilon"];

    for (const seed of testSeeds) {
      await page.goto("");
      await page.fill("#seedInput", seed);
      await startGame(page);

      // Wait for initial duck to spawn
      const newDuckResult = await waitForNewDuckResult(page, 5000);
      if (!newDuckResult.success) {
        console.log(`[Property 1D] Skipping seed ${seed} - no duck spawned`);
        continue;
      }

      const scoreBefore: number = await getGameState(page, "score");

      // Simulate stuck state
      await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.isStatic = true;
          gs.currentDuck.isFalling = false;
        }
      });

      const result = await waitForDuckLandingResult(page, scoreBefore, 1000);

      // Property assertion: stuck detection should work regardless of seed
      expect(result.outcome).toBe("stuck");
      expect(result.duckState).toBeDefined();

      console.log(`[Property 1D] Seed "${seed}" - stuck detected:`, result.outcome);
    }
  });
});
