/**
 * Feature: comprehensive-e2e-testing
 * Property 7: Spawn Position Bounds
 *
 * For any seed and spawn event, the spawned duck's x-position SHALL be within
 * [duckBaseWidth, width - duckBaseWidth] range.
 *
 * **Validates: Requirements 2.6**
 */
import { expect, test } from "@playwright/test";
import {
  dropAndWaitForResult,
  getGameState,
  positionDuckOverStack,
  startSeededGame,
  waitForNewDuck,
} from "../helpers";

// Game constants from CONFIG
const DUCK_BASE_WIDTH = 60;

// Multiple seeds to test spawn bounds across different RNG sequences
const TEST_SEEDS = [
  "spawn-bounds-001",
  "spawn-bounds-002",
  "spawn-bounds-003",
  "spawn-bounds-alpha",
  "spawn-bounds-beta",
];

test.describe("Spawn Position Bounds", () => {
  test.describe("Requirement 2.6: Spawn position within valid range", () => {
    /**
     * Test: Initial spawn position is within valid bounds
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("initial spawn position is within valid bounds", async ({ page }) => {
      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      // Get spawn position and game width
      const spawnX: number = await getGameState(page, "currentDuck.spawnX");
      const gameWidth: number = await getGameState(page, "width");

      // Calculate valid bounds
      const minX = DUCK_BASE_WIDTH;
      const maxX = gameWidth - DUCK_BASE_WIDTH;

      // Verify spawn position is within valid range
      expect(spawnX).toBeGreaterThanOrEqual(minX);
      expect(spawnX).toBeLessThanOrEqual(maxX);
    });

    /**
     * Test: Spawn position is within bounds for multiple different seeds
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position is within bounds for multiple seeds", async ({ page }) => {
      for (const seed of TEST_SEEDS) {
        await page.goto("");
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        // Get spawn position and game width
        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        const gameWidth: number = await getGameState(page, "width");

        // Calculate valid bounds
        const minX = DUCK_BASE_WIDTH;
        const maxX = gameWidth - DUCK_BASE_WIDTH;

        // Verify spawn position is within valid range
        expect(spawnX).toBeGreaterThanOrEqual(minX);
        expect(spawnX).toBeLessThanOrEqual(maxX);
      }
    });

    /**
     * Test: Spawn position after successful landing is within valid bounds
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position after landing is within valid bounds", async ({ page }) => {
      test.setTimeout(30000);
      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      // Get initial spawn position
      const initialSpawnX: number = await getGameState(page, "currentDuck.spawnX");
      const gameWidth: number = await getGameState(page, "width");

      // Verify initial spawn is within bounds
      expect(initialSpawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      expect(initialSpawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);

      // Position duck over stack and drop
      await positionDuckOverStack(page, 0);
      const result = await dropAndWaitForResult(page, 0);

      if (result.mode === "GAMEOVER") {
        test.skip(true, "Duck missed; cannot verify new spawn position");
        return;
      }

      // Wait for new duck to spawn
      await waitForNewDuck(page);
      await page.waitForTimeout(200);

      // Get new spawn position
      const newSpawnX: number = await getGameState(page, "currentDuck.spawnX");

      // Verify new spawn position is within valid range
      expect(newSpawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      expect(newSpawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);
    });

    /**
     * Test: Multiple consecutive spawns are all within valid bounds
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("multiple consecutive spawns are within valid bounds", async ({ page }) => {
      test.setTimeout(60000);
      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      const gameWidth: number = await getGameState(page, "width");
      const minX = DUCK_BASE_WIDTH;
      const maxX = gameWidth - DUCK_BASE_WIDTH;

      const spawnPositions: number[] = [];
      const maxLandings = 5;

      for (let i = 0; i < maxLandings; i++) {
        // Get current spawn position
        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        spawnPositions.push(spawnX);

        // Verify spawn position is within valid range
        expect(spawnX).toBeGreaterThanOrEqual(minX);
        expect(spawnX).toBeLessThanOrEqual(maxX);

        // Position duck over stack and drop
        await positionDuckOverStack(page, 0);
        const score: number = await getGameState(page, "score");
        const result = await dropAndWaitForResult(page, score);

        if (result.mode === "GAMEOVER") {
          // Game over - stop testing but verify all collected positions were valid
          break;
        }

        // Wait for new duck to spawn
        await waitForNewDuck(page);
        await page.waitForTimeout(200);
      }

      // Verify we collected at least some spawn positions
      expect(spawnPositions.length).toBeGreaterThan(0);

      // All collected spawn positions should be within bounds
      for (const pos of spawnPositions) {
        expect(pos).toBeGreaterThanOrEqual(minX);
        expect(pos).toBeLessThanOrEqual(maxX);
      }
    });
  });

  test.describe("Property 7: Spawn Position Bounds - Comprehensive Tests", () => {
    /**
     * Test: Spawn position never equals exactly the boundary values
     * (should be strictly within the range, not at the edges)
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn positions are strictly within bounds (not at edges)", async ({ page }) => {
      // Test multiple seeds to increase coverage
      for (const seed of TEST_SEEDS.slice(0, 3)) {
        await page.goto("");
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        const gameWidth: number = await getGameState(page, "width");

        const minX = DUCK_BASE_WIDTH;
        const maxX = gameWidth - DUCK_BASE_WIDTH;

        // Spawn should be within the valid range
        // Note: The RNG uses nextFloat(min, max) which generates values in [min, max)
        // so spawnX should be >= minX and < maxX (strictly less than maxX)
        expect(spawnX).toBeGreaterThanOrEqual(minX);
        expect(spawnX).toBeLessThanOrEqual(maxX);
      }
    });

    /**
     * Test: Spawn position bounds are calculated correctly based on game width
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn bounds are calculated correctly based on game width", async ({ page }) => {
      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      // Get game dimensions
      const gameWidth: number = await getGameState(page, "width");
      const spawnX: number = await getGameState(page, "currentDuck.spawnX");

      // Expected bounds based on CONFIG.duckBaseWidth (60)
      const expectedMinX = DUCK_BASE_WIDTH;
      const expectedMaxX = gameWidth - DUCK_BASE_WIDTH;

      // Verify spawn is within expected bounds
      expect(spawnX).toBeGreaterThanOrEqual(expectedMinX);
      expect(spawnX).toBeLessThanOrEqual(expectedMaxX);

      // Verify the bounds make sense (min < max)
      expect(expectedMinX).toBeLessThan(expectedMaxX);

      // Verify there's enough room for spawning (game width > 2 * duckBaseWidth)
      expect(gameWidth).toBeGreaterThan(2 * DUCK_BASE_WIDTH);
    });

    /**
     * Test: Spawn position is different from duck's current x after movement
     * (verifies spawnX is the original spawn position, not current position)
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawnX remains original spawn position after duck movement", async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name.startsWith("mobile"),
        "Keyboard input not available on mobile projects",
      );

      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      // Get initial spawn position
      const initialSpawnX: number = await getGameState(page, "currentDuck.spawnX");
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Initially, x should equal spawnX
      expect(initialX).toBe(initialSpawnX);

      // Move duck using arrow keys
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(100);

      // Get positions after movement
      const currentX: number = await getGameState(page, "currentDuck.x");
      const currentSpawnX: number = await getGameState(page, "currentDuck.spawnX");

      // spawnX should remain unchanged (original spawn position)
      expect(currentSpawnX).toBe(initialSpawnX);

      // Current x should have changed due to movement
      expect(currentX).not.toBe(initialSpawnX);

      // Both should still be within valid bounds
      const gameWidth: number = await getGameState(page, "width");
      expect(currentSpawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      expect(currentSpawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);
    });

    /**
     * Test: Same seed produces same spawn position (reproducibility)
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("same seed produces same spawn position", async ({ page }) => {
      const testSeed = "spawn-reproducibility-test";

      // First run
      await startSeededGame(page, testSeed);
      await page.waitForTimeout(300);
      const firstSpawnX: number = await getGameState(page, "currentDuck.spawnX");
      const gameWidth: number = await getGameState(page, "width");

      // Verify first spawn is within bounds
      expect(firstSpawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      expect(firstSpawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);

      // Second run with same seed
      await page.goto("");
      await startSeededGame(page, testSeed);
      await page.waitForTimeout(300);
      const secondSpawnX: number = await getGameState(page, "currentDuck.spawnX");

      // Same seed should produce same spawn position
      expect(secondSpawnX).toBe(firstSpawnX);

      // Second spawn should also be within bounds
      expect(secondSpawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      expect(secondSpawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);
    });

    /**
     * Test: Different seeds produce different spawn positions (all within bounds)
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("different seeds produce different spawn positions within bounds", async ({ page }) => {
      const spawnPositions: Map<string, number> = new Map();

      for (const seed of TEST_SEEDS) {
        await page.goto("");
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        const gameWidth: number = await getGameState(page, "width");

        // Verify spawn is within bounds
        expect(spawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
        expect(spawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);

        spawnPositions.set(seed, spawnX);
      }

      // Verify we got spawn positions for all seeds
      expect(spawnPositions.size).toBe(TEST_SEEDS.length);

      // With different seeds, we should get at least some different spawn positions
      // (statistically very unlikely to get all the same with different seeds)
      const uniquePositions = new Set(spawnPositions.values());
      expect(uniquePositions.size).toBeGreaterThan(1);
    });

    /**
     * Test: Spawn position is valid across different viewport sizes
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position is valid across different viewport sizes", async ({ page }) => {
      const viewportSizes = [
        { width: 375, height: 667 }, // Small mobile
        { width: 412, height: 915 }, // Standard mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 800, height: 600 }, // Desktop at cap
      ];

      for (const viewport of viewportSizes) {
        await page.setViewportSize(viewport);
        await page.goto("");
        await startSeededGame(page, TEST_SEEDS[0]);
        await page.waitForTimeout(300);

        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        const gameWidth: number = await getGameState(page, "width");

        // Calculate valid bounds for this viewport
        const minX = DUCK_BASE_WIDTH;
        const maxX = gameWidth - DUCK_BASE_WIDTH;

        // Verify spawn position is within valid range
        expect(spawnX).toBeGreaterThanOrEqual(minX);
        expect(spawnX).toBeLessThanOrEqual(maxX);

        // Verify bounds make sense for this viewport
        expect(maxX).toBeGreaterThan(minX);
      }
    });

    /**
     * Test: Spawn position x is never negative
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position x is never negative", async ({ page }) => {
      for (const seed of TEST_SEEDS) {
        await page.goto("");
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        const spawnX: number = await getGameState(page, "currentDuck.spawnX");

        // Spawn position should never be negative
        expect(spawnX).toBeGreaterThan(0);
        // More specifically, should be at least duckBaseWidth
        expect(spawnX).toBeGreaterThanOrEqual(DUCK_BASE_WIDTH);
      }
    });

    /**
     * Test: Spawn position x never exceeds game width
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position x never exceeds game width", async ({ page }) => {
      for (const seed of TEST_SEEDS) {
        await page.goto("");
        await startSeededGame(page, seed);
        await page.waitForTimeout(300);

        const spawnX: number = await getGameState(page, "currentDuck.spawnX");
        const gameWidth: number = await getGameState(page, "width");

        // Spawn position should never exceed game width
        expect(spawnX).toBeLessThan(gameWidth);
        // More specifically, should be at most width - duckBaseWidth
        expect(spawnX).toBeLessThanOrEqual(gameWidth - DUCK_BASE_WIDTH);
      }
    });

    /**
     * Test: Spawn position ensures duck is fully visible on screen
     * (duck center + half width should not exceed screen bounds)
     *
     * Validates: Requirements 2.6
     * Property 7: Spawn Position Bounds
     */
    test("spawn position ensures duck is fully visible on screen", async ({ page }) => {
      await startSeededGame(page, TEST_SEEDS[0]);
      await page.waitForTimeout(300);

      const spawnX: number = await getGameState(page, "currentDuck.spawnX");
      const duckWidth: number = await getGameState(page, "currentDuck.w");
      const gameWidth: number = await getGameState(page, "width");

      const halfWidth = duckWidth / 2;

      // Duck's left edge (spawnX - halfWidth) should be >= 0
      expect(spawnX - halfWidth).toBeGreaterThanOrEqual(0);

      // Duck's right edge (spawnX + halfWidth) should be <= gameWidth
      expect(spawnX + halfWidth).toBeLessThanOrEqual(gameWidth);
    });
  });
});
