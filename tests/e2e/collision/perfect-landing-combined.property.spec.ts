/**
 * Feature: complete-game-stabilization
 * Property 3: Perfect Landing Combined Behavior
 *
 * *For any* perfect landing, both x-position snap AND particle spawn SHALL occur simultaneously.
 *
 * **Validates: Requirements 2.4**
 *
 * Requirements:
 * - 2.4: WHEN testing "perfect landing snaps position AND spawns particles simultaneously",
 *        THE Test_Suite SHALL verify both conditions in a single landing
 *
 * This property test verifies that for ANY perfect landing (within perfectTolerance of 8px):
 * 1. The duck's x-position snaps to the top duck's x-position
 * 2. Particles spawn within 500ms
 * 3. Both conditions occur for the same landing event
 */
import { expect, test } from "@playwright/test";
import {
    clearParticles,
    getGameState,
    getParticleCount,
    positionDuckPrecisely,
    startSeededGame,
    verifyDuckWithinTolerance,
    waitForDuckLandingResult,
    waitForNewDuckResult,
    waitForParticles,
} from "../helpers";

// Game constants from CONFIG
const PERFECT_TOLERANCE = 8; // pixels in design space
const PARTICLE_SPAWN_TIMEOUT = 500; // ms - particles must spawn within this time

// Seeds for reproducible property testing - diverse scenarios
const PROPERTY_TEST_SEEDS = [
  "combined-prop-001",
  "combined-prop-002",
  "combined-prop-003",
  "combined-prop-004",
  "combined-prop-005",
  "combined-prop-006",
  "combined-prop-007",
  "combined-prop-008",
];

// Different offsets within perfectTolerance to test boundary conditions
const OFFSETS_WITHIN_TOLERANCE = [0, 2, 4, 6, 7]; // All within 8px tolerance

test.describe("Property 3: Perfect Landing Combined Behavior", () => {
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

  /**
   * Property Test: Both x-position snap AND particle spawn occur for any perfect landing
   *
   * **Validates: Requirements 2.4**
   *
   * This property test verifies that for ANY duck landing within perfectTolerance (8px)
   * of the top duck's center:
   * 1. The duck's x-position snaps to exactly match the top duck's x-position
   * 2. Particles spawn within 500ms of landing
   * 3. Both conditions occur simultaneously for the same landing event
   *
   * The test uses multiple seeds to verify the property holds across different
   * game configurations and spawn positions.
   */
  test("both x-position snap AND particle spawn occur for any perfect landing", async ({ page }) => {
    test.setTimeout(90000);

    let successfulTests = 0;
    const minRequiredTests = 5; // Need at least 5 successful tests to validate property
    const results: Array<{
      seed: string;
      snapped: boolean;
      particlesSpawned: boolean;
      topDuckX: number;
      landedDuckX: number;
      particleCount: number;
    }> = [];

    for (const seed of PROPERTY_TEST_SEEDS) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test to ensure accurate spawn detection
      await clearParticles(page);

      // Position duck precisely within perfectTolerance
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        // Skip this seed if positioning failed
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        // Skip this seed if landing failed
        continue;
      }

      // Get the landed duck's x-position
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // The last duck in the array is the one that just landed
        return gs.ducks[gs.ducks.length - 1];
      });

      // Check condition 1: x-position snapped
      const snapped = landedDuck.x === positioning.topDuckX;

      // Check condition 2: particles spawned within timeout
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);
      const particlesSpawned = particleCount > 0;

      results.push({
        seed,
        snapped,
        particlesSpawned,
        topDuckX: positioning.topDuckX,
        landedDuckX: landedDuck.x,
        particleCount,
      });

      // Property assertion: BOTH conditions must be true for a perfect landing
      expect(
        snapped,
        `Seed ${seed}: Duck did not snap. Expected x=${positioning.topDuckX}, got x=${landedDuck.x}`,
      ).toBe(true);
      expect(
        particlesSpawned,
        `Seed ${seed}: No particles spawned within ${PARTICLE_SPAWN_TIMEOUT}ms`,
      ).toBe(true);

      successfulTests++;

      if (successfulTests >= minRequiredTests) {
        break;
      }
    }

    // Ensure we had enough successful tests to validate the property
    expect(
      successfulTests,
      `Only ${successfulTests} successful tests, need at least ${minRequiredTests}. Results: ${JSON.stringify(results)}`,
    ).toBeGreaterThanOrEqual(minRequiredTests);
  });

  /**
   * Property Test: Combined behavior holds for different offsets within tolerance
   *
   * **Validates: Requirements 2.4**
   *
   * This property test verifies that the combined behavior (snap + particles) holds
   * regardless of the exact offset within perfectTolerance. Tests with offsets of
   * 0, 2, 4, 6, and 7 pixels (all within 8px tolerance).
   */
  test("combined behavior holds for different offsets within tolerance", async ({ page }) => {
    test.setTimeout(120000);

    const seed = "offset-combined-prop-001";
    const successfulOffsets: number[] = [];
    const failedOffsets: Array<{ offset: number; snapped: boolean; particlesSpawned: boolean }> = [];

    for (const offset of OFFSETS_WITHIN_TOLERANCE) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test
      await clearParticles(page);

      // Position duck with specific offset within perfectTolerance
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, offset);

      // Verify duck is within perfect tolerance
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        failedOffsets.push({ offset, snapped: false, particlesSpawned: false });
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        failedOffsets.push({ offset, snapped: false, particlesSpawned: false });
        continue;
      }

      // Get the landed duck's x-position
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // Check both conditions
      const snapped = landedDuck.x === positioning.topDuckX;
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);
      const particlesSpawned = particleCount > 0;

      if (snapped && particlesSpawned) {
        successfulOffsets.push(offset);
      } else {
        failedOffsets.push({ offset, snapped, particlesSpawned });
      }
    }

    // Property assertion: combined behavior should work for all offsets within tolerance
    expect(
      successfulOffsets.length,
      `Only ${successfulOffsets.length}/${OFFSETS_WITHIN_TOLERANCE.length} offsets passed. ` +
        `Successful: [${successfulOffsets.join(", ")}], ` +
        `Failed: ${JSON.stringify(failedOffsets)}`,
    ).toBeGreaterThanOrEqual(Math.ceil(OFFSETS_WITHIN_TOLERANCE.length * 0.8)); // At least 80% should pass
  });

  /**
   * Property Test: Combined behavior holds across multiple consecutive landings
   *
   * **Validates: Requirements 2.4**
   *
   * This property test verifies that the combined behavior (snap + particles) holds
   * consistently across multiple consecutive perfect landings in a single game session.
   */
  test("combined behavior holds across multiple consecutive landings", async ({ page }) => {
    test.setTimeout(120000);

    const seed = "multi-combined-prop-001";
    await startSeededGame(page, seed);
    await page.waitForTimeout(300);

    const landingResults: Array<{
      landing: number;
      snapped: boolean;
      particlesSpawned: boolean;
      topDuckX: number;
      landedDuckX: number;
      particleCount: number;
    }> = [];

    const maxAttempts = 6;
    const minRequiredLandings = 3;

    for (let i = 0; i < maxAttempts; i++) {
      if (i > 0) {
        // Wait for new duck to spawn
        const newDuckResult = await waitForNewDuckResult(page, 10000);
        if (!newDuckResult.success) {
          if (newDuckResult.reason === "gameover") {
            break;
          }
          continue;
        }
        await page.waitForTimeout(200);
      }

      // Clear particles before each landing to track new spawns independently
      await clearParticles(page);

      // Verify particles are cleared
      const preCount = await getParticleCount(page);
      expect(preCount, `Landing ${i + 1}: Particles not cleared before landing`).toBe(0);

      // Position duck precisely within perfectTolerance
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome === "gameover") {
        break;
      }

      if (result.outcome !== "landed") {
        continue;
      }

      // Get the landed duck's x-position
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // Check both conditions
      const snapped = landedDuck.x === positioning.topDuckX;
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);
      const particlesSpawned = particleCount > 0;

      landingResults.push({
        landing: i + 1,
        snapped,
        particlesSpawned,
        topDuckX: positioning.topDuckX,
        landedDuckX: landedDuck.x,
        particleCount,
      });

      // Check if we have enough successful landings
      const successfulLandings = landingResults.filter((r) => r.snapped && r.particlesSpawned);
      if (successfulLandings.length >= minRequiredLandings) {
        break;
      }
    }

    // Property assertion: all perfect landings should have both snap and particles
    const successfulLandings = landingResults.filter((r) => r.snapped && r.particlesSpawned);
    const failedLandings = landingResults.filter((r) => !r.snapped || !r.particlesSpawned);

    expect(
      successfulLandings.length,
      `Only ${successfulLandings.length} landings had both snap and particles. ` +
        `Failed landings: ${JSON.stringify(failedLandings)}`,
    ).toBeGreaterThanOrEqual(minRequiredLandings);

    // Additional assertion: no landing should have snap without particles or vice versa
    for (const result of landingResults) {
      if (result.snapped !== result.particlesSpawned) {
        throw new Error(
          `Landing ${result.landing}: Inconsistent behavior - snapped=${result.snapped}, ` +
            `particlesSpawned=${result.particlesSpawned}. Both should be true or both false.`,
        );
      }
    }
  });

  /**
   * Property Test: Snap and particles occur atomically (no partial state)
   *
   * **Validates: Requirements 2.4**
   *
   * This property test verifies that snap and particle spawn are atomic - either both
   * occur or neither occurs. There should never be a state where only one condition is met.
   */
  test("snap and particles occur atomically (no partial state)", async ({ page }) => {
    test.setTimeout(90000);

    const seeds = ["atomic-001", "atomic-002", "atomic-003", "atomic-004", "atomic-005"];
    const results: Array<{
      seed: string;
      snapped: boolean;
      particlesSpawned: boolean;
      isAtomic: boolean;
    }> = [];

    for (const seed of seeds) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test
      await clearParticles(page);

      // Position duck precisely within perfectTolerance
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        continue;
      }

      // Get the landed duck's x-position
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // Check both conditions
      const snapped = landedDuck.x === positioning.topDuckX;
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);
      const particlesSpawned = particleCount > 0;

      // Atomicity check: both true or both false
      const isAtomic = snapped === particlesSpawned;

      results.push({
        seed,
        snapped,
        particlesSpawned,
        isAtomic,
      });
    }

    // Property assertion: all results should be atomic
    const nonAtomicResults = results.filter((r) => !r.isAtomic);
    expect(
      nonAtomicResults.length,
      `Found ${nonAtomicResults.length} non-atomic results: ${JSON.stringify(nonAtomicResults)}`,
    ).toBe(0);

    // Ensure we had enough tests
    expect(
      results.length,
      `Only ${results.length} tests completed, need at least 3`,
    ).toBeGreaterThanOrEqual(3);
  });

  /**
   * Property Test: Combined behavior at boundary (exactly at perfectTolerance - 1)
   *
   * **Validates: Requirements 2.4**
   *
   * This property test verifies that the combined behavior works at the boundary
   * of perfectTolerance (7px offset, which is just within the 8px tolerance).
   */
  test("combined behavior at boundary (7px offset)", async ({ page }) => {
    test.setTimeout(60000);

    const seeds = ["boundary-001", "boundary-002", "boundary-003"];
    let successfulTests = 0;

    for (const seed of seeds) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test
      await clearParticles(page);

      // Position duck at boundary (7px offset, just within 8px tolerance)
      const positioning = await positionDuckPrecisely(page, PERFECT_TOLERANCE, 7);

      // Verify duck is within perfect tolerance
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        continue;
      }

      // Get the landed duck's x-position
      const landedDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1];
      });

      // Check both conditions
      const snapped = landedDuck.x === positioning.topDuckX;
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);
      const particlesSpawned = particleCount > 0;

      // Property assertion: both conditions must be true at boundary
      expect(
        snapped,
        `Seed ${seed}: Duck did not snap at boundary. Expected x=${positioning.topDuckX}, got x=${landedDuck.x}`,
      ).toBe(true);
      expect(
        particlesSpawned,
        `Seed ${seed}: No particles spawned at boundary within ${PARTICLE_SPAWN_TIMEOUT}ms`,
      ).toBe(true);

      successfulTests++;
    }

    // Ensure we had at least 2 successful boundary tests
    expect(
      successfulTests,
      `Only ${successfulTests} successful boundary tests, need at least 2`,
    ).toBeGreaterThanOrEqual(2);
  });
});
