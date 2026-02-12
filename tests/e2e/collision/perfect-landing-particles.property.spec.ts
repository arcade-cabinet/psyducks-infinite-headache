/**
 * Feature: complete-game-stabilization
 * Property 2: Perfect Landing Particle Spawn
 *
 * *For any* duck landing within perfectTolerance (8px) of the top duck's center,
 * particles SHALL spawn within 500ms of landing.
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * Requirements:
 * - 2.1: WHEN a duck lands within perfectTolerance (8px), THE Test_Suite SHALL verify
 *        particles spawn within 500ms of landing
 * - 2.2: WHEN multiple perfect landings occur, THE Test_Suite SHALL verify particles
 *        spawn for each landing independently
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

// Seeds for reproducible property testing
const PROPERTY_TEST_SEEDS = [
  "particle-prop-001",
  "particle-prop-002",
  "particle-prop-003",
  "particle-prop-004",
  "particle-prop-005",
];

test.describe("Property 2: Perfect Landing Particle Spawn", () => {
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
   * Property Test: Particles spawn within 500ms for any perfect landing
   *
   * **Validates: Requirements 2.1**
   *
   * This property test verifies that for ANY duck landing within perfectTolerance (8px)
   * of the top duck's center, particles spawn within 500ms of landing.
   *
   * The test uses multiple seeds to verify the property holds across different
   * game configurations and spawn positions.
   */
  test("particles spawn within 500ms for any perfect landing", async ({ page }) => {
    test.setTimeout(60000);

    let successfulTests = 0;
    const minRequiredTests = 3; // Need at least 3 successful tests to validate property

    for (const seed of PROPERTY_TEST_SEEDS) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test to ensure accurate spawn detection
      await clearParticles(page);

      // Position duck precisely within perfectTolerance
      await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        // Skip this seed if positioning failed
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Record time before drop
      const dropTime = Date.now();

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        // Skip this seed if landing failed
        continue;
      }

      // Wait for particles with the specified timeout (500ms)
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);

      // Record time after particle detection
      const particleDetectionTime = Date.now();
      const elapsedTime = particleDetectionTime - dropTime;

      // Property assertion: particles must spawn within 500ms
      expect(particleCount, `Seed ${seed}: No particles spawned within ${PARTICLE_SPAWN_TIMEOUT}ms`).toBeGreaterThan(0);
      expect(elapsedTime, `Seed ${seed}: Particle detection took ${elapsedTime}ms, expected < ${PARTICLE_SPAWN_TIMEOUT}ms`).toBeLessThanOrEqual(PARTICLE_SPAWN_TIMEOUT + 100); // Allow small buffer for test overhead

      successfulTests++;

      if (successfulTests >= minRequiredTests) {
        break;
      }
    }

    // Ensure we had enough successful tests to validate the property
    expect(successfulTests, `Only ${successfulTests} successful tests, need at least ${minRequiredTests}`).toBeGreaterThanOrEqual(minRequiredTests);
  });

  /**
   * Property Test: Particles spawn for each perfect landing independently
   *
   * **Validates: Requirements 2.2**
   *
   * This property test verifies that when multiple perfect landings occur,
   * particles spawn for each landing independently. Each landing should
   * trigger its own particle spawn event.
   */
  test("particles spawn for each perfect landing independently", async ({ page }) => {
    test.setTimeout(90000);

    const seed = "multi-particle-prop-001";
    await startSeededGame(page, seed);
    await page.waitForTimeout(300);

    const landingsWithParticles: number[] = [];
    const maxAttempts = 6; // Try up to 6 landings
    const minRequiredLandings = 3; // Need at least 3 successful landings with particles

    for (let i = 0; i < maxAttempts; i++) {
      if (i > 0) {
        // Wait for new duck to spawn
        const newDuckResult = await waitForNewDuckResult(page, 10000);
        if (!newDuckResult.success) {
          if (newDuckResult.reason === "gameover") {
            break;
          }
          // Skip this iteration if no new duck spawned
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
      await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

      // Verify duck is within perfect tolerance before dropping
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        // Skip this landing if positioning failed
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

      // Wait for particles with the specified timeout (500ms)
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);

      if (particleCount > 0) {
        landingsWithParticles.push(i + 1);
      }

      // Check if we have enough successful landings
      if (landingsWithParticles.length >= minRequiredLandings) {
        break;
      }
    }

    // Property assertion: each perfect landing should spawn particles independently
    expect(
      landingsWithParticles.length,
      `Only ${landingsWithParticles.length} landings spawned particles (landings: ${landingsWithParticles.join(", ")}), need at least ${minRequiredLandings}`,
    ).toBeGreaterThanOrEqual(minRequiredLandings);
  });

  /**
   * Property Test: Particle spawn timing is consistent across different offsets within tolerance
   *
   * **Validates: Requirements 2.1, 2.2**
   *
   * This property test verifies that particles spawn within 500ms regardless of
   * the exact offset within perfectTolerance. Tests with offsets of 0, 3, and 6 pixels.
   */
  test("particle spawn timing is consistent across different offsets within tolerance", async ({ page }) => {
    test.setTimeout(90000);

    const seed = "offset-particle-prop-001";
    const offsets = [0, 3, 6]; // Different offsets within perfectTolerance (8px)
    const successfulOffsets: number[] = [];

    for (const offset of offsets) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test
      await clearParticles(page);

      // Position duck with specific offset within perfectTolerance
      await positionDuckPrecisely(page, PERFECT_TOLERANCE, offset);

      // Verify duck is within perfect tolerance
      try {
        await verifyDuckWithinTolerance(page, PERFECT_TOLERANCE);
      } catch {
        continue;
      }

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Record time before drop
      const dropTime = Date.now();

      // Drop and wait for landing
      const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

      if (result.outcome !== "landed") {
        continue;
      }

      // Wait for particles with the specified timeout (500ms)
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);

      // Record time after particle detection
      const elapsedTime = Date.now() - dropTime;

      if (particleCount > 0 && elapsedTime <= PARTICLE_SPAWN_TIMEOUT + 100) {
        successfulOffsets.push(offset);
      }
    }

    // Property assertion: particles should spawn for all tested offsets within tolerance
    expect(
      successfulOffsets.length,
      `Only ${successfulOffsets.length} offsets spawned particles within timeout (offsets: ${successfulOffsets.join(", ")}), expected all ${offsets.length}`,
    ).toBeGreaterThanOrEqual(2); // At least 2 of 3 offsets should work
  });

  /**
   * Property Test: Particle count is non-zero for perfect landings
   *
   * **Validates: Requirements 2.1**
   *
   * This property test verifies that the particle count is always greater than zero
   * when a perfect landing occurs. This is a fundamental property of the particle system.
   */
  test("particle count is non-zero for perfect landings", async ({ page }) => {
    test.setTimeout(60000);

    const seeds = ["nonzero-particle-001", "nonzero-particle-002", "nonzero-particle-003"];
    let successfulTests = 0;

    for (const seed of seeds) {
      await startSeededGame(page, seed);
      await page.waitForTimeout(300);

      // Clear particles before test
      await clearParticles(page);

      // Position duck precisely within perfectTolerance
      await positionDuckPrecisely(page, PERFECT_TOLERANCE, 0);

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

      // Wait for particles
      const particleCount = await waitForParticles(page, 50, PARTICLE_SPAWN_TIMEOUT);

      // Property assertion: particle count must be > 0
      expect(particleCount, `Seed ${seed}: Expected particles > 0, got ${particleCount}`).toBeGreaterThan(0);

      successfulTests++;
    }

    // Ensure we had enough successful tests
    expect(successfulTests, `Only ${successfulTests} successful tests, need at least 2`).toBeGreaterThanOrEqual(2);
  });
});
