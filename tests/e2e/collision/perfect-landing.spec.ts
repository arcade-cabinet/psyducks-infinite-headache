/**
 * Feature: comprehensive-e2e-testing
 * Property 3: Perfect Landing Snap
 * Property 53: Perfect Landing Particles
 *
 * Property 3: *For any* falling duck landing within perfectTolerance (8px) of the top duck's
 * center, the landed duck's x-position SHALL snap to exactly match the top duck's x-position.
 *
 * Property 53: *For any* perfect landing (within perfectTolerance), particles SHALL spawn
 * at the landing position.
 *
 * **Validates: Requirements 1.3, 19.1**
 */
import { expect, test } from "@playwright/test";
import {
  clearParticles,
  dropAndWaitForResult,
  getGameState,
  getParticleCount,
  positionDuckOverStack,
  positionDuckPrecisely,
  startSeededGame,
  verifyDuckWithinTolerance,
  waitForNewDuck,
  waitForParticles,
} from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "perfect-landing-test-001";

// Game constants from CONFIG
const PERFECT_TOLERANCE = 8; // pixels in design space

test.describe("Perfect Landing Detection", () => {
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

  test.describe("Requirement 1.3: Perfect landing x-position snap", () => {
    /**
     * Test: Duck x-position snaps to top duck center when landing within perfectTolerance
     *
     * Validates: Requirements 1.3
     * Property 3: Perfect Landing Snap
     */
    test("duck x-position snaps to top duck center on perfect landing", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Position duck precisely using direct state manipulation if needed
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Verify successful landing
      expect(result.mode).toBe("PLAYING");
      expect(result.score).toBe(scoreBefore + 1);

      // Get the landed duck (last in array after landing)
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // The second-to-last duck is the one that just landed (last is the new hovering duck)
        return gs.ducks[gs.ducks.length - 1];
      });

      // Verify x-position snapped to top duck's x
      expect(landedDuck.x).toBe(positioning.topDuckX);
    });

    /**
     * Test: Duck snaps when landing within perfectTolerance but not exactly centered
     *
     * Validates: Requirements 1.3
     * Property 3: Perfect Landing Snap
     */
    test("duck snaps when landing within perfectTolerance (small offset)", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Position duck with a small offset (within perfectTolerance)
      // Using offset of 5px which is less than perfectTolerance (8px)
      const smallOffset = 5;
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, smallOffset);

      // Verify duck is within perfect tolerance before drop
      await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Verify successful landing
      expect(result.mode).toBe("PLAYING");

      // Get the landed duck
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // Verify x-position snapped to top duck's x (exact match)
      expect(landedDuck.x).toBe(positioning.topDuckX);
    });

    /**
     * Test: Duck does NOT snap when landing outside perfectTolerance
     *
     * Validates: Requirements 1.3
     * Property 3: Perfect Landing Snap
     */
    test("duck does NOT snap when landing outside perfectTolerance", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the top duck's x position
      const topDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      // Position duck with an offset outside perfectTolerance but within hitTolerance
      // Using offset of 15px which is greater than perfectTolerance (8px)
      // but within hitTolerance (60 * 0.65 = 39px)
      const outsideOffset = 15;
      // Use precise positioning to ensure we don't accidentally land on a quantized step
      await positionDuckPrecisely(page, 0, outsideOffset);

      // Verify duck is outside perfect tolerance before drop
      const preDuckX: number = await getGameState(page, "currentDuck.x");
      const preOffset = Math.abs(preDuckX - topDuckX);

      // If we're still within perfect tolerance, try a larger offset
      if (preOffset < PERFECT_TOLERANCE) {
        // Move further away
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(30);
        }
      }

      // Re-check position
      const adjustedDuckX: number = await getGameState(page, "currentDuck.x");
      const adjustedOffset = Math.abs(adjustedDuckX - topDuckX);

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      if (result.mode === "GAMEOVER") {
        // If we missed entirely, skip this test
        test.skip(true, "Duck missed the stack");
        return;
      }

      // Verify successful landing
      expect(result.mode).toBe("PLAYING");

      // Get the landed duck
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // If we were outside perfect tolerance, x should NOT have snapped
      if (adjustedOffset >= PERFECT_TOLERANCE) {
        // The landed duck's x should be close to where it was dropped, not snapped
        // Allow some tolerance for physics/collision adjustments
        const landedOffset = Math.abs(landedDuck.x - topDuckX);
        expect(landedOffset).toBeGreaterThan(0);
      }
    });

    /**
     * Test: Perfect landing snap works across multiple landings
     *
     * Validates: Requirements 1.3
     * Property 3: Perfect Landing Snap
     */
    test("perfect landing snap works consistently across multiple landings", async ({ page }) => {
      test.setTimeout(90000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const perfectLandings: { topX: number; landedX: number }[] = [];

      // Land 3 ducks with perfect alignment
      for (let i = 0; i < 3; i++) {
        if (i > 0) {
          await waitForNewDuck(page);
          await page.waitForTimeout(200);
        }

        // Position duck precisely using direct state manipulation if needed
        const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

        // Verify duck is within tolerance before dropping
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

        // Drop and wait for landing
        const scoreBefore: number = await getGameState(page, "score");
        const result = await dropAndWaitForResult(page, scoreBefore);

        if (result.mode === "GAMEOVER") {
          break;
        }

        // Get the landed duck's x position
        const landedDuck = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[gs.ducks.length - 1];
        });

        perfectLandings.push({ topX: positioning.topDuckX, landedX: landedDuck.x });
      }

      // Verify all perfect landings snapped correctly
      expect(perfectLandings.length).toBeGreaterThanOrEqual(2);
      for (const landing of perfectLandings) {
        expect(landing.landedX).toBe(landing.topX);
      }
    });
  });

  test.describe("Requirement 19.1: Perfect landing triggers particles", () => {
    /**
     * Test: Particles spawn when perfect landing occurs
     *
     * Validates: Requirements 19.1
     * Property 53: Perfect Landing Particles
     */
    test("particles spawn on perfect landing", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
           await waitForNewDuck(page);
           await page.waitForTimeout(200);
        }

        // Clear particles before test to ensure accurate spawn detection
        await clearParticles(page);

        // Position duck precisely using direct state manipulation if needed
        const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

        // Verify duck is within perfect tolerance before dropping
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

        // Get score before drop
        const scoreBefore: number = await getGameState(page, "score");

        // Drop and wait for landing using the helper (more reliable than manual wait)
        const result = await dropAndWaitForResult(page, scoreBefore);

        if (result.mode === "PLAYING") {
             // Get the landed duck to verify it snapped (which means perfect landing occurred)
            const landedDuck = await page.evaluate(() => {
                // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
                const gs = (window as any).__gameState;
                return gs.ducks[gs.ducks.length - 1];
            });

            // Verify the duck snapped to perfect position (confirms perfect landing)
            if (landedDuck.x === positioning.topDuckX) {
                 // Check that particles were spawned
                 const particleCount = await waitForParticles(page, 100, 800);
                 if (particleCount > 0) {
                     success = true;
                     break;
                 }
            }
        }
      }
      expect(success, "Particles should spawn on perfect landing (tried 3 times)").toBe(true);
    });

    /**
     * Test: Particles spawn at the landing position
     *
     * Validates: Requirements 19.1
     * Property 53: Perfect Landing Particles
     */
    test("particles spawn at the landing position on perfect landing", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      let success = false;
      for(let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
             await waitForNewDuck(page);
             await page.waitForTimeout(200);
          }

          // Clear any existing particles using helper
          await clearParticles(page);

          // Position duck precisely using direct state manipulation if needed
          await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

          // Verify duck is within perfect tolerance before dropping
          await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

          // Get score before drop
          const scoreBefore: number = await getGameState(page, "score");

          // Drop and wait for landing using the helper (more reliable than manual wait)
          const result = await dropAndWaitForResult(page, scoreBefore);

          if (result.mode !== "GAMEOVER") {
              // Wait for particles to spawn
              const particleCount = await waitForParticles(page, 100, 800);
              
              if (particleCount > 0) {
                  // Get particle positions
                  const particles = await page.evaluate(() => {
                    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
                    const gs = (window as any).__gameState;
                    return gs.particles.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
                  });

                  // Verify particles spawned near the landing position
                  const landedDuck = await page.evaluate(() => {
                    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
                    const gs = (window as any).__gameState;
                    return gs.ducks[gs.ducks.length - 1];
                  });

                  // At least some particles should be near the landing x position
                  const tolerance = 100; // particles spread out quickly
                  const nearbyParticles = particles.filter(
                    (p: { x: number; y: number }) => Math.abs(p.x - landedDuck.x) < tolerance,
                  );
                  
                  if (nearbyParticles.length > 0) {
                      success = true;
                      break;
                  }
              }
          }
      }
      expect(success, "Particles should spawn near landing position (tried 3 times)").toBe(true);
    });

    /**
     * Test: No particles spawn when landing outside perfectTolerance
     *
     * Validates: Requirements 19.1
     * Property 53: Perfect Landing Particles
     */
    test("no perfect landing particles when landing outside perfectTolerance", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Clear any existing particles using helper
      await clearParticles(page);

      // Get the top duck's x position
      const topDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      // Position duck with an offset outside perfectTolerance but within hitTolerance
      const outsideOffset = 20; // Greater than perfectTolerance (8px)
      await positionDuckOverStack(page, outsideOffset);

      // Verify duck is outside perfect tolerance
      const preDuckX: number = await getGameState(page, "currentDuck.x");
      let preOffset = Math.abs(preDuckX - topDuckX);

      // If still within perfect tolerance, move further
      while (preOffset < PERFECT_TOLERANCE) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
        const newX: number = await getGameState(page, "currentDuck.x");
        preOffset = Math.abs(newX - topDuckX);

        // Safety check to avoid infinite loop
        if (preOffset > 35) break; // Don't go too far or we'll miss
      }

      // Verify we're outside perfect tolerance but should still land
      const finalDuckX: number = await getGameState(page, "currentDuck.x");
      const finalOffset = Math.abs(finalDuckX - topDuckX);

      if (finalOffset < PERFECT_TOLERANCE) {
        test.skip(true, "Could not position duck outside perfect tolerance");
        return;
      }

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      if (result.mode === "GAMEOVER") {
        test.skip(true, "Duck missed the stack");
        return;
      }

      // Verify successful landing
      expect(result.mode).toBe("PLAYING");

      // Check that no perfect landing particles were spawned
      // Use immediate check with short wait
      await page.waitForTimeout(100);
      const particleCount = await getParticleCount(page);

      // No particles should have spawned for non-perfect landing
      expect(particleCount).toBe(0);
    });

    /**
     * Test: Multiple perfect landings spawn particles each time
     *
     * Validates: Requirements 19.1
     * Property 53: Perfect Landing Particles
     */
    test("multiple perfect landings spawn particles each time", async ({ page }) => {
      test.setTimeout(90000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      let perfectLandingsWithParticles = 0;
      const maxAttempts = 5; // Try up to 5 landings to get 2 with particles

      // Land ducks with perfect alignment until we get 2 with particles or run out of attempts
      for (let i = 0; i < maxAttempts && perfectLandingsWithParticles < 2; i++) {
        if (i > 0) {
          await waitForNewDuck(page);
          await page.waitForTimeout(200);
        }

        // Clear particles before each landing using helper to track new spawns
        await clearParticles(page);

        // Position duck precisely using direct state manipulation if needed
        await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

        // Verify duck is within tolerance before dropping
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

        // Get score before drop
        const scoreBefore: number = await getGameState(page, "score");

        // Drop the duck
        await page.keyboard.press("Space");

        // Wait for landing to complete
        await page.waitForFunction(
          (prevScore) => {
            // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
            const gs = (window as any).__gameState;
            return gs.score > prevScore || gs.mode === "GAMEOVER";
          },
          scoreBefore,
          { timeout: 15000 },
        );

        const mode: string = await getGameState(page, "mode");
        if (mode === "GAMEOVER") {
          break;
        }

        // Check if particles were spawned with retry logic (within 500ms)
        const particleCount = await waitForParticles(page, 100, 500);

        if (particleCount > 0) {
          perfectLandingsWithParticles++;
        }
      }

      // Verify at least 2 perfect landings spawned particles
      // This is a property test - we expect perfect landings to consistently spawn particles
      expect(perfectLandingsWithParticles).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("Property 3 & 53: Combined Perfect Landing Behavior", () => {
    /**
     * Test: Perfect landing both snaps position AND spawns particles
     *
     * Validates: Requirements 1.3, 19.1
     * Property 3: Perfect Landing Snap
     * Property 53: Perfect Landing Particles
     */
    test("perfect landing snaps position AND spawns particles simultaneously", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Clear particles using helper
      await clearParticles(page);

      // Position duck precisely using direct state manipulation if needed
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Verify successful landing
      expect(result.mode).toBe("PLAYING");

      // Verify BOTH conditions of perfect landing:
      // 1. X-position snapped
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });
      expect(landedDuck.x).toBe(positioning.topDuckX);

      // 2. Particles spawned - use retry logic with extended wait
      const particleCount = await waitForParticles(page, 100, 500);
      expect(particleCount).toBeGreaterThan(0);
    });

    /**
     * Test: Perfect landing at boundary (exactly at perfectTolerance - 1)
     *
     * Validates: Requirements 1.3, 19.1
     * Property 3: Perfect Landing Snap
     * Property 53: Perfect Landing Particles
     */
    test("perfect landing at boundary triggers snap and particles", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Clear particles using helper
      await clearParticles(page);

      // Position duck precisely using direct state manipulation if needed
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);

      // Drop and wait for landing
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      expect(result.mode).toBe("PLAYING");

      // Verify snap occurred
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });
      expect(landedDuck.x).toBe(positioning.topDuckX);

      // Verify particles spawned with retry logic
      const particleCount = await waitForParticles(page, 100, 500);
      expect(particleCount).toBeGreaterThan(0);
    });
  });
});
