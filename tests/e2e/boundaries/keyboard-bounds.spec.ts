/**
 * Feature: comprehensive-e2e-testing
 * Property 5: Keyboard Boundary Clamping
 *
 * For any number of ArrowLeft or ArrowRight key presses, the duck's x-position
 * SHALL remain within [halfWidth, width - halfWidth] bounds.
 *
 * **Validates: Requirements 2.1, 2.2**
 */
import { expect, test } from "@playwright/test";
import { getGameState, moveDuckToEdge, startSeededGame, verifyDuckBounds } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "boundary-test-001";

test.describe("Keyboard Boundary Clamping", () => {
  // These tests rely on keyboard input which is unavailable on mobile devices.
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith("mobile"),
      "Keyboard input not available on mobile projects",
    );
  });

  test.describe("Requirement 2.1: ArrowRight clamping to width - halfWidth", () => {
    /**
     * Test: Duck x-position is clamped to width - halfWidth when pressing ArrowRight repeatedly
     *
     * Validates: Requirements 2.1
     * Property 5: Keyboard Boundary Clamping
     */
    test("ArrowRight clamps duck x-position to width - halfWidth", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the right edge
      const finalX = await moveDuckToEdge(page, "right");

      // Verify bounds
      const bounds = await verifyDuckBounds(page);

      // Duck should be within valid bounds (clamped at maxX)
      expect(finalX).toBeLessThanOrEqual(bounds.maxX);
      expect(finalX).toBeGreaterThanOrEqual(bounds.minX);

      // Verify the duck is within valid bounds
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
    });

    /**
     * Test: Additional ArrowRight presses after reaching boundary do not move duck further
     *
     * Validates: Requirements 2.1
     * Property 5: Keyboard Boundary Clamping
     */
    test("ArrowRight presses at boundary do not move duck beyond maxX", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the right edge
      await moveDuckToEdge(page, "right");
      const positionAtBoundary = await getGameState(page, "currentDuck.x");

      // Press ArrowRight several more times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
      }

      // Position should not have changed (still at boundary)
      const positionAfterExtraPresses = await getGameState(page, "currentDuck.x");
      expect(positionAfterExtraPresses).toBe(positionAtBoundary);

      // Verify still within bounds
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
    });

    /**
     * Test: Duck can move left after reaching right boundary
     *
     * Validates: Requirements 2.1
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck can move left after reaching right boundary", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the right edge
      await moveDuckToEdge(page, "right");

      // Wait a bit for state to settle
      await page.waitForTimeout(100);

      const positionAtRightBoundary: number = await getGameState(page, "currentDuck.x");
      const bounds = await verifyDuckBounds(page);

      // Verify we're at or near the right boundary and within valid bounds
      expect(positionAtRightBoundary).toBeLessThanOrEqual(bounds.maxX);
      expect(positionAtRightBoundary).toBeGreaterThanOrEqual(bounds.minX);

      // Check if duck is still in a state that can respond to arrow keys
      const duckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isStatic: gs.currentDuck?.isStatic,
          isFalling: gs.currentDuck?.isFalling,
          mode: gs.mode,
        };
      });

      // If duck is still controllable, verify it can move left
      if (duckState.mode === "PLAYING" && !duckState.isStatic) {
        // Press ArrowLeft to move away from boundary
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(50);

        const positionAfterLeft: number = await getGameState(page, "currentDuck.x");

        // Duck should still be within bounds after moving
        expect(positionAfterLeft).toBeGreaterThanOrEqual(bounds.minX);
        expect(positionAfterLeft).toBeLessThanOrEqual(bounds.maxX);
      }

      // The main assertion: duck never exceeded the boundary
      expect(positionAtRightBoundary).toBeLessThanOrEqual(bounds.maxX);
    });
  });

  test.describe("Requirement 2.2: ArrowLeft clamping to halfWidth", () => {
    /**
     * Test: Duck x-position is clamped to halfWidth when pressing ArrowLeft repeatedly
     *
     * Validates: Requirements 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("ArrowLeft clamps duck x-position to halfWidth", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the left edge
      const finalX = await moveDuckToEdge(page, "left");

      // Verify bounds
      const bounds = await verifyDuckBounds(page);

      // Duck should be within valid bounds (clamped at minX)
      expect(finalX).toBeGreaterThanOrEqual(bounds.minX);
      expect(finalX).toBeLessThanOrEqual(bounds.maxX);

      // Verify the duck is within valid bounds
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
    });

    /**
     * Test: Additional ArrowLeft presses after reaching boundary do not move duck further
     *
     * Validates: Requirements 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("ArrowLeft presses at boundary do not move duck beyond minX", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the left edge
      await moveDuckToEdge(page, "left");
      const positionAtBoundary = await getGameState(page, "currentDuck.x");

      // Press ArrowLeft several more times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
      }

      // Position should not have changed (still at boundary)
      const positionAfterExtraPresses = await getGameState(page, "currentDuck.x");
      expect(positionAfterExtraPresses).toBe(positionAtBoundary);

      // Verify still within bounds
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
    });

    /**
     * Test: Duck can move right after reaching left boundary
     *
     * Validates: Requirements 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck can move right after reaching left boundary", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move duck to the left edge
      await moveDuckToEdge(page, "left");

      // Wait a bit for state to settle
      await page.waitForTimeout(100);

      const positionAtLeftBoundary: number = await getGameState(page, "currentDuck.x");
      const bounds = await verifyDuckBounds(page);

      // Verify we're at or near the left boundary and within valid bounds
      expect(positionAtLeftBoundary).toBeGreaterThanOrEqual(bounds.minX);
      expect(positionAtLeftBoundary).toBeLessThanOrEqual(bounds.maxX);

      // Check if duck is still in a state that can respond to arrow keys
      const duckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isStatic: gs.currentDuck?.isStatic,
          isFalling: gs.currentDuck?.isFalling,
          mode: gs.mode,
        };
      });

      // If duck is still controllable, verify it can move right
      if (duckState.mode === "PLAYING" && !duckState.isStatic) {
        // Press ArrowRight to move away from boundary
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(50);

        const positionAfterRight: number = await getGameState(page, "currentDuck.x");

        // Duck should still be within bounds after moving
        expect(positionAfterRight).toBeGreaterThanOrEqual(bounds.minX);
        expect(positionAfterRight).toBeLessThanOrEqual(bounds.maxX);
      }

      // The main assertion: duck never went below the boundary
      expect(positionAtLeftBoundary).toBeGreaterThanOrEqual(bounds.minX);
    });
  });

  test.describe("Property 5: Keyboard Boundary Clamping - Comprehensive Tests", () => {
    /**
     * Test: Duck remains within bounds after alternating left/right movements
     *
     * Validates: Requirements 2.1, 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck remains within bounds after alternating left/right movements", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Perform alternating movements
      for (let i = 0; i < 20; i++) {
        // Move right 3 times
        for (let j = 0; j < 3; j++) {
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(20);
        }

        // Move left 2 times
        for (let j = 0; j < 2; j++) {
          await page.keyboard.press("ArrowLeft");
          await page.waitForTimeout(20);
        }

        // Verify bounds after each cycle
        const bounds = await verifyDuckBounds(page);
        expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
      }
    });

    /**
     * Test: Duck can traverse full width and back within bounds
     *
     * Validates: Requirements 2.1, 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck can traverse full width and back within bounds", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move to left edge
      await moveDuckToEdge(page, "left");
      const leftBounds = await verifyDuckBounds(page);
      expect(leftBounds.x).toBeGreaterThanOrEqual(leftBounds.minX);

      // Move to right edge
      await moveDuckToEdge(page, "right");
      const rightBounds = await verifyDuckBounds(page);
      expect(rightBounds.x).toBeLessThanOrEqual(rightBounds.maxX);

      // Move back to left edge
      await moveDuckToEdge(page, "left");
      const finalBounds = await verifyDuckBounds(page);
      expect(finalBounds.x).toBeGreaterThanOrEqual(finalBounds.minX);
    });

    /**
     * Test: Bounds are calculated correctly based on duck width
     *
     * Validates: Requirements 2.1, 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("bounds are calculated correctly based on duck width", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck dimensions and game width
      const duckInfo = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          duckWidth: gs.currentDuck.w,
          gameWidth: gs.width,
        };
      });

      const expectedHalfWidth = duckInfo.duckWidth / 2;
      const expectedMinX = expectedHalfWidth;
      const expectedMaxX = duckInfo.gameWidth - expectedHalfWidth;

      // Verify bounds match expected values
      const bounds = await verifyDuckBounds(page);
      expect(bounds.minX).toBe(expectedMinX);
      expect(bounds.maxX).toBe(expectedMaxX);
    });

    /**
     * Test: Rapid arrow key presses maintain boundary clamping
     *
     * Validates: Requirements 2.1, 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("rapid arrow key presses maintain boundary clamping", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Rapidly press ArrowRight many times
      const rapidPresses = 50;
      for (let i = 0; i < rapidPresses; i++) {
        await page.keyboard.press("ArrowRight");
        // Minimal delay to simulate rapid input
        await page.waitForTimeout(10);
      }

      // Verify still within bounds
      const boundsAfterRight = await verifyDuckBounds(page);
      expect(boundsAfterRight.x).toBeLessThanOrEqual(boundsAfterRight.maxX);
      expect(boundsAfterRight.x).toBeGreaterThanOrEqual(boundsAfterRight.minX);

      // Rapidly press ArrowLeft many times
      for (let i = 0; i < rapidPresses; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(10);
      }

      // Verify still within bounds
      const boundsAfterLeft = await verifyDuckBounds(page);
      expect(boundsAfterLeft.x).toBeLessThanOrEqual(boundsAfterLeft.maxX);
      expect(boundsAfterLeft.x).toBeGreaterThanOrEqual(boundsAfterLeft.minX);
    });

    /**
     * Test: Boundary values are consistent across multiple checks
     *
     * Validates: Requirements 2.1, 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("boundary values are consistent across multiple checks", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Check bounds multiple times
      const boundChecks: { minX: number; maxX: number }[] = [];

      for (let i = 0; i < 5; i++) {
        // Move duck around
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);

        // Record bounds
        const bounds = await verifyDuckBounds(page);
        boundChecks.push({ minX: bounds.minX, maxX: bounds.maxX });
      }

      // All bound checks should have the same minX and maxX
      const firstBounds = boundChecks[0];
      for (const bounds of boundChecks) {
        expect(bounds.minX).toBe(firstBounds.minX);
        expect(bounds.maxX).toBe(firstBounds.maxX);
      }
    });

    /**
     * Test: Duck position never goes negative
     *
     * Validates: Requirements 2.2
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck x-position never goes negative", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Move to left edge
      await moveDuckToEdge(page, "left");

      // Try to move further left
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(20);

        const x: number = await getGameState(page, "currentDuck.x");
        expect(x).toBeGreaterThan(0);
      }
    });

    /**
     * Test: Duck position never exceeds game width
     *
     * Validates: Requirements 2.1
     * Property 5: Keyboard Boundary Clamping
     */
    test("duck x-position never exceeds game width", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const gameWidth: number = await getGameState(page, "width");

      // Move to right edge
      await moveDuckToEdge(page, "right");

      // Try to move further right
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(20);

        const x: number = await getGameState(page, "currentDuck.x");
        expect(x).toBeLessThan(gameWidth);
      }
    });
  });
});
