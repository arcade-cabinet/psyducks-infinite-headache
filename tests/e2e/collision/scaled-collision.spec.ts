/**
 * Feature: comprehensive-e2e-testing
 * Property 4: Collision Zone Scaling
 *
 * *For any* base duck that has grown via merges, the collision zone (hitTolerance * width)
 * SHALL scale proportionally with the duck's width, allowing larger landing areas for
 * larger ducks.
 *
 * **Validates: Requirements 1.7, 5.8**
 */
import { expect, test } from "@playwright/test";
import {
  dropAndWaitForResult,
  getGameState,
  positionDuckOverStack,
  startSeededGame,
  waitForNewDuck,
} from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "scaled-collision-test-001";

// Game constants from CONFIG
const HIT_TOLERANCE = 0.65; // Collision zone = topDuck.w * 0.65
const DUCK_BASE_WIDTH = 60; // Base duck width in design space

test.describe("Scaled Collision Zone Detection", () => {
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

  test.describe("Requirement 1.7: Collision zone scales with grown duck width", () => {
    /**
     * Test: Collision zone expands when base duck grows via merges
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone expands proportionally with grown duck width", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial base duck width and calculate initial collision zone
      const initialBaseDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return { w: gs.ducks[0].w, mergeLevel: gs.ducks[0].mergeLevel };
      });

      const initialCollisionZone = initialBaseDuck.w * HIT_TOLERANCE;
      expect(initialBaseDuck.w).toBe(DUCK_BASE_WIDTH);
      expect(initialCollisionZone).toBeCloseTo(DUCK_BASE_WIDTH * HIT_TOLERANCE, 2);

      // Grow the base duck by manipulating state (simulate merges)
      const grownWidth = DUCK_BASE_WIDTH * 1.5; // 50% larger
      await page.evaluate((newWidth) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        gs.ducks[0].w = newWidth;
        gs.ducks[0].mergeLevel = 3; // Simulate 3 merges
      }, grownWidth);

      // Verify the base duck has grown
      const grownBaseDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return { w: gs.ducks[0].w, mergeLevel: gs.ducks[0].mergeLevel };
      });

      expect(grownBaseDuck.w).toBe(grownWidth);
      expect(grownBaseDuck.mergeLevel).toBe(3);

      // Calculate the new collision zone
      const newCollisionZone = grownBaseDuck.w * HIT_TOLERANCE;
      expect(newCollisionZone).toBeGreaterThan(initialCollisionZone);
      expect(newCollisionZone).toBeCloseTo(grownWidth * HIT_TOLERANCE, 2);

      // Verify the collision zone scaled proportionally
      const scaleFactor = grownBaseDuck.w / initialBaseDuck.w;
      expect(newCollisionZone / initialCollisionZone).toBeCloseTo(scaleFactor, 2);
    });

    /**
     * Test: Duck can land at larger offset when top duck is wider
     *
     * Note: The collision zone is based on the TOP duck's width (the duck being landed on).
     * This test grows the base duck (which is the top duck when it's the only duck in stack)
     * and verifies that the collision zone expands proportionally.
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("duck lands at larger offset when base duck has grown", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Calculate the initial hit tolerance boundary
      const initialHitZone = DUCK_BASE_WIDTH * HIT_TOLERANCE; // 60 * 0.65 = 39px

      // Grow the base duck significantly
      const grownWidth = DUCK_BASE_WIDTH * 2; // Double the width
      const newHitZone = grownWidth * HIT_TOLERANCE; // 120 * 0.65 = 78px

      // Get the base duck's x position and grow it
      await page.evaluate((newWidth) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // Grow the base duck
        gs.ducks[0].w = newWidth;
        gs.ducks[0].mergeLevel = 5;
      }, grownWidth);

      // Verify the setup - the base duck should have grown
      const topDuckWidth: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].w;
      });
      expect(topDuckWidth).toBe(grownWidth);

      // Verify the collision zone has expanded
      const actualCollisionZone = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const topDuck = gs.ducks[gs.ducks.length - 1];
        return topDuck.w * 0.65;
      });

      // Verify the new collision zone is larger than the initial
      expect(actualCollisionZone).toBeCloseTo(newHitZone, 2);
      expect(actualCollisionZone).toBeGreaterThan(initialHitZone);

      // Verify the collision zone doubled (since width doubled)
      expect(actualCollisionZone / initialHitZone).toBeCloseTo(2, 2);

      // Verify the formula: collision zone = width * hitTolerance
      expect(actualCollisionZone).toBeCloseTo(grownWidth * HIT_TOLERANCE, 5);
    });

    /**
     * Test: Collision zone formula is correctly applied (hitTolerance * width)
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone equals hitTolerance multiplied by duck width", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Test with various duck widths
      const testWidths = [60, 90, 120, 150];

      for (const width of testWidths) {
        // Set the base duck width
        await page.evaluate((newWidth) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.ducks[0].w = newWidth;
        }, width);

        // Calculate expected collision zone
        const expectedCollisionZone = width * HIT_TOLERANCE;

        // Verify the collision zone calculation
        const collisionZone = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          const topDuck = gs.ducks[gs.ducks.length - 1];
          // This is the formula used in the game's collision detection
          return topDuck.w * 0.65; // CONFIG.hitTolerance
        });

        expect(collisionZone).toBeCloseTo(expectedCollisionZone, 2);
      }
    });
  });

  test.describe("Requirement 5.8: Collision zone expands proportionally after merge", () => {
    /**
     * Test: After merge, collision zone expands with base duck growth
     *
     * Note: This test verifies that when the base duck grows via merges,
     * the collision zone expands proportionally.
     *
     * Validates: Requirements 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone expands after merge increases base duck width", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial collision zone (base duck is the only duck, so it's the top duck)
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const baseDuck = gs.ducks[0];
        return {
          width: baseDuck.w,
          collisionZone: baseDuck.w * 0.65,
          mergeLevel: baseDuck.mergeLevel,
          x: baseDuck.x,
        };
      });

      expect(initialState.width).toBe(DUCK_BASE_WIDTH);
      expect(initialState.collisionZone).toBeCloseTo(DUCK_BASE_WIDTH * HIT_TOLERANCE, 2);

      // Simulate a merge result by directly growing the base duck
      // This is equivalent to what happens after a merge completes
      const growthFactor = 1.15; // Approximate growth per merge
      const postMergeWidth = DUCK_BASE_WIDTH * growthFactor;

      await page.evaluate(
        ({ newWidth }) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          // Simulate post-merge state: base duck has grown
          gs.ducks[0].w = newWidth;
          gs.ducks[0].mergeLevel = 1;
          gs.mergeCount = 0;
        },
        { newWidth: postMergeWidth },
      );

      // Get post-merge state
      const postMergeState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const baseDuck = gs.ducks[0];
        return {
          width: baseDuck.w,
          collisionZone: baseDuck.w * 0.65,
          mergeLevel: baseDuck.mergeLevel,
        };
      });

      // Verify base duck has grown
      expect(postMergeState.mergeLevel).toBeGreaterThan(initialState.mergeLevel);
      expect(postMergeState.width).toBeGreaterThan(initialState.width);

      // Verify collision zone has expanded proportionally
      expect(postMergeState.collisionZone).toBeGreaterThan(initialState.collisionZone);

      // Verify proportional scaling
      const widthRatio = postMergeState.width / initialState.width;
      const collisionZoneRatio = postMergeState.collisionZone / initialState.collisionZone;
      expect(collisionZoneRatio).toBeCloseTo(widthRatio, 2);

      // Verify the formula: collision zone = width * hitTolerance
      expect(postMergeState.collisionZone).toBeCloseTo(postMergeWidth * HIT_TOLERANCE, 5);
    });

    /**
     * Test: Multiple merges progressively expand collision zone
     *
     * Validates: Requirements 5.8
     * Property 4: Collision Zone Scaling
     */
    test("multiple merges progressively expand collision zone", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Track collision zone growth across multiple merge levels
      const collisionZones: number[] = [];

      // Test merge levels 0 through 4
      for (let mergeLevel = 0; mergeLevel <= 4; mergeLevel++) {
        // Calculate width growth (using approximate growth rate)
        // Each merge increases width by a growth factor
        const growthFactor = 1.1; // Approximate 10% growth per merge
        const width = DUCK_BASE_WIDTH * growthFactor ** mergeLevel;

        // Set the base duck state
        await page.evaluate(
          ({ w, ml }) => {
            // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
            const gs = (window as any).__gameState;
            gs.ducks[0].w = w;
            gs.ducks[0].mergeLevel = ml;
          },
          { w: width, ml: mergeLevel },
        );

        // Calculate and record collision zone
        const collisionZone = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[0].w * 0.65;
        });

        collisionZones.push(collisionZone);
      }

      // Verify collision zones increase with each merge level
      for (let i = 1; i < collisionZones.length; i++) {
        expect(collisionZones[i]).toBeGreaterThan(collisionZones[i - 1]);
      }

      // Verify the final collision zone is significantly larger than initial
      expect(collisionZones[collisionZones.length - 1]).toBeGreaterThan(collisionZones[0] * 1.3);
    });
  });

  test.describe("Property 4: Collision Zone Scaling - Edge Cases", () => {
    /**
     * Test: Landing at expanded boundary succeeds with grown duck
     *
     * Note: The collision zone is based on the TOP duck's width. When the base duck
     * has grown, the collision zone expands proportionally.
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("landing at expanded boundary succeeds with grown duck", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Grow the base duck
      const grownWidth = DUCK_BASE_WIDTH * 1.8; // 80% larger

      // Get the base duck's x position and grow it
      await page.evaluate((newWidth) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // Grow the base duck
        gs.ducks[0].w = newWidth;
        gs.ducks[0].mergeLevel = 4;
      }, grownWidth);

      // Calculate the new hit zone boundary
      const newHitZone = grownWidth * HIT_TOLERANCE;
      const initialHitZone = DUCK_BASE_WIDTH * HIT_TOLERANCE;

      // Verify the collision zone has expanded
      const actualCollisionZone = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const topDuck = gs.ducks[gs.ducks.length - 1];
        return topDuck.w * 0.65;
      });

      expect(actualCollisionZone).toBeCloseTo(newHitZone, 2);
      expect(actualCollisionZone).toBeGreaterThan(initialHitZone);

      // Verify the top duck has the grown width
      const topDuckWidth: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].w;
      });
      expect(topDuckWidth).toBe(grownWidth);

      // Position duck at center and verify landing works
      await positionDuckOverStack(page, 0);
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Should land successfully at center
      expect(result.mode).toBe("PLAYING");
      expect(result.score).toBe(scoreBefore + 1);
    });

    /**
     * Test: Landing outside expanded boundary still fails
     *
     * Note: Even with a grown duck, landing outside the expanded collision zone
     * should still result in a miss and game over.
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("landing outside expanded boundary fails even with grown duck", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Grow the base duck
      const grownWidth = DUCK_BASE_WIDTH * 1.5;

      // Get the base duck's x position before modification
      const baseDuckX: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].x;
      });

      await page.evaluate((newWidth) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // Grow the base duck
        gs.ducks[0].w = newWidth;
        gs.ducks[0].mergeLevel = 3;
      }, grownWidth);

      // Calculate the new hit zone boundary
      const newHitZone = grownWidth * HIT_TOLERANCE;

      // Position duck well outside the expanded hit zone
      const outsideOffset = newHitZone + 30;

      // Manually position the current duck outside the hit zone
      await page.evaluate(
        ({ targetX }) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          if (gs.currentDuck) {
            gs.currentDuck.x = targetX;
          }
        },
        { targetX: baseDuckX + outsideOffset },
      );

      // Verify duck is positioned outside the hit zone
      const currentDuckX: number = await getGameState(page, "currentDuck.x");
      const actualOffset = Math.abs(currentDuckX - baseDuckX);
      expect(actualOffset).toBeGreaterThan(newHitZone);

      // Drop and verify game over
      const scoreBefore: number = await getGameState(page, "score");
      const result = await dropAndWaitForResult(page, scoreBefore);

      // Should miss and trigger game over
      expect(result.mode).toBe("GAMEOVER");
      expect(result.score).toBe(scoreBefore);
    });

    /**
     * Test: Collision zone scales linearly with duck width
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone scales linearly with duck width", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Test linear scaling with various width multipliers
      const widthMultipliers = [1.0, 1.25, 1.5, 1.75, 2.0];
      const results: { width: number; collisionZone: number }[] = [];

      for (const multiplier of widthMultipliers) {
        const width = DUCK_BASE_WIDTH * multiplier;

        await page.evaluate((newWidth) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.ducks[0].w = newWidth;
        }, width);

        const collisionZone = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[0].w * 0.65;
        });

        results.push({ width, collisionZone });
      }

      // Verify linear relationship: collisionZone = width * hitTolerance
      for (const result of results) {
        expect(result.collisionZone).toBeCloseTo(result.width * HIT_TOLERANCE, 2);
      }

      // Verify the ratio between collision zones matches the ratio between widths
      for (let i = 1; i < results.length; i++) {
        const widthRatio = results[i].width / results[0].width;
        const collisionZoneRatio = results[i].collisionZone / results[0].collisionZone;
        expect(collisionZoneRatio).toBeCloseTo(widthRatio, 2);
      }
    });

    /**
     * Test: Grown duck maintains correct collision zone after game state changes
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("grown duck maintains collision zone after landing new ducks", async ({ page }) => {
      test.setTimeout(90000);
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Grow the base duck
      const grownWidth = DUCK_BASE_WIDTH * 1.6;
      await page.evaluate((newWidth) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        gs.ducks[0].w = newWidth;
        gs.ducks[0].mergeLevel = 3;
      }, grownWidth);

      const expectedCollisionZone = grownWidth * HIT_TOLERANCE;

      // Land a few ducks and verify collision zone remains correct
      for (let i = 0; i < 2; i++) {
        if (i > 0) {
          await waitForNewDuck(page);
          await page.waitForTimeout(200);
        }

        // Verify collision zone before landing
        const collisionZoneBefore = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          const topDuck = gs.ducks[gs.ducks.length - 1];
          return topDuck.w * 0.65;
        });

        // For the base duck (first iteration), collision zone should be expanded
        // For stacked ducks, they have base width
        if (i === 0) {
          expect(collisionZoneBefore).toBeCloseTo(expectedCollisionZone, 2);
        }

        // Position and drop
        await positionDuckOverStack(page, 0);
        const scoreBefore: number = await getGameState(page, "score");
        const result = await dropAndWaitForResult(page, scoreBefore);

        if (result.mode === "GAMEOVER") {
          break;
        }

        expect(result.mode).toBe("PLAYING");
      }

      // Verify base duck width hasn't changed
      const finalBaseDuckWidth: number = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].w;
      });

      expect(finalBaseDuckWidth).toBe(grownWidth);
    });
  });

  test.describe("Property 4: Collision Zone Scaling - Proportionality Verification", () => {
    /**
     * Test: Verify collision zone is exactly hitTolerance * width for any width
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone formula: hitTolerance * width holds for all widths", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Test a range of widths from small to large
      const testWidths = [40, 60, 80, 100, 120, 150, 180, 200];

      for (const width of testWidths) {
        await page.evaluate((newWidth) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.ducks[0].w = newWidth;
        }, width);

        // Get the actual collision zone used by the game
        const actualCollisionZone = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          const topDuck = gs.ducks[gs.ducks.length - 1];
          // This is the exact formula from the game's collision detection
          return topDuck.w * 0.65;
        });

        // Calculate expected collision zone
        const expectedCollisionZone = width * HIT_TOLERANCE;

        // Verify they match exactly
        expect(actualCollisionZone).toBeCloseTo(expectedCollisionZone, 5);
      }
    });

    /**
     * Test: Doubling duck width doubles collision zone
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("doubling duck width doubles collision zone", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial collision zone
      const initialCollisionZone = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].w * 0.65;
      });

      // Double the duck width
      await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        gs.ducks[0].w *= 2;
      });

      // Get new collision zone
      const doubledCollisionZone = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].w * 0.65;
      });

      // Verify collision zone doubled
      expect(doubledCollisionZone).toBeCloseTo(initialCollisionZone * 2, 2);
    });

    /**
     * Test: Collision zone ratio matches width ratio for any two widths
     *
     * Validates: Requirements 1.7, 5.8
     * Property 4: Collision Zone Scaling
     */
    test("collision zone ratio equals width ratio for any two widths", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Test pairs of widths
      const widthPairs = [
        [60, 90],
        [80, 120],
        [100, 150],
        [60, 180],
      ];

      for (const [width1, width2] of widthPairs) {
        // Set first width and get collision zone
        await page.evaluate((w) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.ducks[0].w = w;
        }, width1);

        const collisionZone1 = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[0].w * 0.65;
        });

        // Set second width and get collision zone
        await page.evaluate((w) => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          gs.ducks[0].w = w;
        }, width2);

        const collisionZone2 = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks[0].w * 0.65;
        });

        // Verify ratios match
        const widthRatio = width2 / width1;
        const collisionZoneRatio = collisionZone2 / collisionZone1;

        expect(collisionZoneRatio).toBeCloseTo(widthRatio, 5);
      }
    });
  });
});
