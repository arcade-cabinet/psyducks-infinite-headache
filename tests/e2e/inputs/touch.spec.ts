/**
 * Feature: comprehensive-e2e-testing
 * Property 13: Touch Drag State
 *
 * For any touch start on a hovering duck, isDragging SHALL become true with correct
 * touchIdentifier, and touch move SHALL update duck position. Touch end SHALL trigger
 * drop. Touch cancel SHALL handle gracefully.
 *
 * **Validates: Requirements 3.7, 3.8, 3.9, 3.10**
 */
import { expect, test } from "@playwright/test";
import { designToScreen, getGameState, startSeededGame, verifyDuckBounds } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "touch-input-test-001";

test.describe("Touch Input Tests", () => {
  // Skip Firefox for timing-sensitive physics tests (slow rAF in headless mode)
  // Skip WebKit/Safari as the Touch constructor is not available (Illegal constructor error)
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for touch input physics tests",
    );
    test.skip(
      testInfo.project.name === "webkit" || testInfo.project.name === "mobile-safari",
      "WebKit does not support Touch constructor for programmatic touch events",
    );
  });

  test.describe("Requirement 3.7: Touch Start Initiates Drag", () => {
    /**
     * Test: Touch start on duck initiates drag with correct identifier
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("touch start on duck sets isDragging=true and isBeingDragged=true", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is in hover state (not falling, not static)
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isDragging: gs.isDragging,
        };
      });

      expect(initialState.isFalling).toBe(false);
      expect(initialState.isStatic).toBe(false);
      expect(initialState.isBeingDragged).toBe(false);
      expect(initialState.isDragging).toBe(false);

      // Get duck position and convert to screen coordinates
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Dispatch touchstart event manually to initiate drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag state is now active
      const afterTouchState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterTouchState.isDragging).toBe(true);
      expect(afterTouchState.isBeingDragged).toBe(true);
      expect(afterTouchState.isFalling).toBe(false);

      // Clean up by dispatching touchend
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        const touchEndEvent = new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          changedTouches: [
            new Touch({
              identifier: 1,
              target: canvas,
              clientX: 0,
              clientY: 0,
            }),
          ],
        });
        canvas.dispatchEvent(touchEndEvent);
      });
    });

    /**
     * Test: Touch on duck's center area initiates drag
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("touch on duck center area initiates drag", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position (center is the tummy area)
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Dispatch touchstart on duck center
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 42,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag initiated
      const isDragging = await getGameState(page, "isDragging");
      const isBeingDragged = await getGameState(page, "currentDuck.isBeingDragged");

      expect(isDragging).toBe(true);
      expect(isBeingDragged).toBe(true);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });

    /**
     * Test: Duck does not fall while being touched/dragged
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("duck does not fall while being touched", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify duck is being dragged and not falling
      const initialY: number = await getGameState(page, "currentDuck.y");
      const isBeingDragged = await getGameState(page, "currentDuck.isBeingDragged");
      expect(isBeingDragged).toBe(true);

      // Wait a bit and verify Y hasn't changed (duck not falling)
      await page.waitForTimeout(200);

      const afterWaitY: number = await getGameState(page, "currentDuck.y");
      const stillDragging = await getGameState(page, "currentDuck.isBeingDragged");

      expect(stillDragging).toBe(true);
      expect(afterWaitY).toBe(initialY);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });
  });

  test.describe("Requirement 3.8: Touch Move Updates Position", () => {
    /**
     * Test: Touch move updates duck position during drag
     *
     * Validates: Requirements 3.8
     * Property 13: Touch Drag State
     */
    test("touch move updates duck x-position", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag started
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(true);

      // Move touch to the right
      const newScreenPos = await designToScreen(page, duckX + 100, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify duck moved
      const newDuckX: number = await getGameState(page, "currentDuck.x");
      expect(newDuckX).toBeGreaterThan(duckX);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });

    /**
     * Test: Touch move respects boundary clamping
     *
     * Validates: Requirements 3.8
     * Property 13: Touch Drag State
     */
    test("touch move respects boundary clamping", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position and game dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const gameWidth: number = await getGameState(page, "width");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Try to move touch far beyond right boundary
      const farRightScreen = await designToScreen(page, gameWidth + 500, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: farRightScreen.x, y: farRightScreen.y },
      );

      await page.waitForTimeout(50);

      // Verify duck position is clamped
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });

    /**
     * Test: Multiple touch moves update position correctly
     *
     * Validates: Requirements 3.8
     * Property 13: Touch Drag State
     */
    test("multiple touch moves update position correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Perform multiple touch moves
      const positions: number[] = [duckX];
      const offsets = [50, 100, 50, -30];

      for (const offset of offsets) {
        const targetX = duckX + offset;
        const moveScreenPos = await designToScreen(page, targetX, duckY);

        await page.evaluate(
          ({ x, y }) => {
            const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
            const touchMoveEvent = new TouchEvent("touchmove", {
              bubbles: true,
              cancelable: true,
              touches: [
                new Touch({
                  identifier: 1,
                  target: canvas,
                  clientX: x,
                  clientY: y,
                }),
              ],
            });
            canvas.dispatchEvent(touchMoveEvent);
          },
          { x: moveScreenPos.x, y: moveScreenPos.y },
        );

        await page.waitForTimeout(30);
        const currentX: number = await getGameState(page, "currentDuck.x");
        positions.push(currentX);
      }

      // Verify positions changed
      const uniquePositions = new Set(positions.map((p) => Math.round(p)));
      expect(uniquePositions.size).toBeGreaterThan(1);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });
  });

  test.describe("Requirement 3.9: Touch End Triggers Drop", () => {
    /**
     * Test: Touch end triggers drop - isBeingDragged=false, isFalling=true
     *
     * Validates: Requirements 3.9
     * Property 13: Touch Drag State
     */
    test("touch end sets isBeingDragged=false and isFalling=true", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag is active
      const duringDragState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(duringDragState.isDragging).toBe(true);
      expect(duringDragState.isBeingDragged).toBe(true);
      expect(duringDragState.isFalling).toBe(false);

      // End touch (release)
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEndEvent = new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEndEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify duck is now falling
      const afterReleaseState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterReleaseState.isDragging).toBe(false);
      expect(afterReleaseState.isBeingDragged).toBe(false);
      expect(afterReleaseState.isFalling).toBe(true);
    });

    /**
     * Test: Touch end preserves duck position
     *
     * Validates: Requirements 3.9
     * Property 13: Touch Drag State
     */
    test("touch end preserves duck x-position", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Move touch to a new position
      const newX = duckX + 80;
      const newScreenPos = await designToScreen(page, newX, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Get position before release
      const positionBeforeRelease: number = await getGameState(page, "currentDuck.x");

      // End touch
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEndEvent = new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEndEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Get position after release
      const positionAfterRelease: number = await getGameState(page, "currentDuck.x");

      // X position should be preserved (duck falls from where it was released)
      expect(positionAfterRelease).toBe(positionBeforeRelease);
    });

    /**
     * Test: Touch end triggers drop immediately
     *
     * Validates: Requirements 3.9
     * Property 13: Touch Drag State
     */
    test("touch end triggers drop immediately without delay", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify not falling during drag
      const beforeRelease = await getGameState(page, "currentDuck.isFalling");
      expect(beforeRelease).toBe(false);

      // End touch
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEndEvent = new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEndEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      // Check state immediately after release (no waitForTimeout)
      const afterRelease = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      // The key assertion: isFalling should be true immediately after release
      expect(afterRelease.isFalling).toBe(true);
      expect(afterRelease.isBeingDragged).toBe(false);
    });
  });

  test.describe("Requirement 3.10: Touch Cancel Handles Gracefully", () => {
    /**
     * Test: Touch cancel ends drag gracefully
     *
     * Validates: Requirements 3.10
     * Property 13: Touch Drag State
     */
    test("touch cancel ends drag gracefully", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag is active
      const duringDragState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(duringDragState.isDragging).toBe(true);
      expect(duringDragState.isBeingDragged).toBe(true);

      // Dispatch touchcancel event
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        const touchCancelEvent = new TouchEvent("touchcancel", {
          bubbles: true,
          cancelable: true,
          touches: [],
        });
        canvas.dispatchEvent(touchCancelEvent);
      });

      await page.waitForTimeout(50);

      // Verify drag ended gracefully
      const afterCancelState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterCancelState.isDragging).toBe(false);
      expect(afterCancelState.isBeingDragged).toBe(false);
      expect(afterCancelState.isFalling).toBe(true);
    });

    /**
     * Test: Touch cancel during move ends drag gracefully
     *
     * Validates: Requirements 3.10
     * Property 13: Touch Drag State
     */
    test("touch cancel during move ends drag gracefully", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Move touch
      const newScreenPos = await designToScreen(page, duckX + 50, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y },
      );

      await page.waitForTimeout(30);

      // Verify still dragging
      const stillDragging = await getGameState(page, "isDragging");
      expect(stillDragging).toBe(true);

      // Dispatch touchcancel
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        const touchCancelEvent = new TouchEvent("touchcancel", {
          bubbles: true,
          cancelable: true,
          touches: [],
        });
        canvas.dispatchEvent(touchCancelEvent);
      });

      await page.waitForTimeout(50);

      // Verify drag ended
      const afterCancel = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterCancel.isDragging).toBe(false);
      expect(afterCancel.isBeingDragged).toBe(false);
      expect(afterCancel.isFalling).toBe(true);
    });

    /**
     * Test: Game state remains consistent after touch cancel
     *
     * Validates: Requirements 3.10
     * Property 13: Touch Drag State
     */
    test("game state remains consistent after touch cancel", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Dispatch touchcancel
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        const touchCancelEvent = new TouchEvent("touchcancel", {
          bubbles: true,
          cancelable: true,
          touches: [],
        });
        canvas.dispatchEvent(touchCancelEvent);
      });

      await page.waitForTimeout(50);

      // Verify game state is consistent
      const gameState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
          currentDuckExists: !!gs.currentDuck,
          ducksArrayExists: Array.isArray(gs.ducks),
        };
      });

      expect(gameState.mode).toBe("PLAYING");
      expect(gameState.isDragging).toBe(false);
      expect(gameState.currentDuckExists).toBe(true);
      expect(gameState.ducksArrayExists).toBe(true);
    });
  });

  test.describe("Property 13: Touch Drag State - Comprehensive Tests", () => {
    /**
     * Test: Touch away from duck triggers drop (not drag)
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("touch away from duck triggers drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position and game dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const gameWidth: number = await getGameState(page, "width");

      // Touch far away from the duck
      const farAwayX = duckX > gameWidth / 2 ? 50 : gameWidth - 50;
      const screenPos = await designToScreen(page, farAwayX, duckY + 100);

      // Verify duck is not falling initially
      const initialFalling = await getGameState(page, "currentDuck.isFalling");
      expect(initialFalling).toBe(false);

      // Dispatch touchstart away from duck
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify duck is now falling (not dragging)
      const afterTouchState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(afterTouchState.isFalling).toBe(true);
      expect(afterTouchState.isDragging).toBe(false);
      expect(afterTouchState.isBeingDragged).toBe(false);
    });

    /**
     * Test: Touch identifier is tracked correctly during drag
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("touch identifier is tracked correctly during drag", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch with specific identifier
      const touchId = 123;
      await page.evaluate(
        ({ x, y, id }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: id,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y, id: touchId },
      );

      await page.waitForTimeout(50);

      // Verify drag started
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(true);

      // Move with same identifier - should update position
      const newScreenPos = await designToScreen(page, duckX + 50, duckY);
      await page.evaluate(
        ({ x, y, id }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: id,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y, id: touchId },
      );

      await page.waitForTimeout(50);

      // Verify duck moved
      const newDuckX: number = await getGameState(page, "currentDuck.x");
      expect(newDuckX).toBeGreaterThan(duckX);

      // Clean up
      await page.evaluate(
        ({ id }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          canvas.dispatchEvent(
            new TouchEvent("touchend", {
              bubbles: true,
              cancelable: true,
              touches: [],
              changedTouches: [
                new Touch({
                  identifier: id,
                  target: canvas,
                  clientX: 0,
                  clientY: 0,
                }),
              ],
            }),
          );
        },
        { id: touchId },
      );
    });

    /**
     * Test: Touch move with wrong identifier is ignored
     *
     * Validates: Requirements 3.7, 3.8
     * Property 13: Touch Drag State
     */
    test("touch move with wrong identifier is ignored", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start touch with identifier 1
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag started
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(true);

      // Get position after drag start
      const positionAfterStart: number = await getGameState(page, "currentDuck.x");

      // Try to move with different identifier (should be ignored)
      const newScreenPos = await designToScreen(page, duckX + 100, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 999, // Different identifier
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: newScreenPos.x, y: newScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify duck position didn't change (move was ignored)
      const positionAfterWrongMove: number = await getGameState(page, "currentDuck.x");
      expect(positionAfterWrongMove).toBe(positionAfterStart);

      // Clean up
      await page.evaluate(() => {
        const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
        canvas.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
          }),
        );
      });
    });

    /**
     * Test: Full touch drag cycle works correctly
     *
     * Validates: Requirements 3.7, 3.8, 3.9
     * Property 13: Touch Drag State
     */
    test("full touch drag cycle: start -> move -> end", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial duck position
      const initialX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, initialX, duckY);

      // 1. Touch start - initiate drag
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEvent = new TouchEvent("touchstart", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEvent);
        },
        { x: screenPos.x, y: screenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drag started
      let state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(state.isDragging).toBe(true);
      expect(state.isBeingDragged).toBe(true);
      expect(state.isFalling).toBe(false);

      // 2. Touch move - update position
      const targetX = initialX + 60;
      const moveScreenPos = await designToScreen(page, targetX, duckY);
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchMoveEvent = new TouchEvent("touchmove", {
            bubbles: true,
            cancelable: true,
            touches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchMoveEvent);
        },
        { x: moveScreenPos.x, y: moveScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify position updated
      const movedX: number = await getGameState(page, "currentDuck.x");
      expect(movedX).toBeGreaterThan(initialX);

      // Still dragging
      state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(state.isDragging).toBe(true);
      expect(state.isBeingDragged).toBe(true);
      expect(state.isFalling).toBe(false);

      // 3. Touch end - trigger drop
      await page.evaluate(
        ({ x, y }) => {
          const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
          const touchEndEvent = new TouchEvent("touchend", {
            bubbles: true,
            cancelable: true,
            touches: [],
            changedTouches: [
              new Touch({
                identifier: 1,
                target: canvas,
                clientX: x,
                clientY: y,
              }),
            ],
          });
          canvas.dispatchEvent(touchEndEvent);
        },
        { x: moveScreenPos.x, y: moveScreenPos.y },
      );

      await page.waitForTimeout(50);

      // Verify drop triggered
      state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(state.isDragging).toBe(false);
      expect(state.isBeingDragged).toBe(false);
      expect(state.isFalling).toBe(true);

      // Verify duck falls from moved position
      const finalX: number = await getGameState(page, "currentDuck.x");
      expect(finalX).toBe(movedX);
    });

    /**
     * Test: Touch only works in PLAYING mode
     *
     * Validates: Requirements 3.7
     * Property 13: Touch Drag State
     */
    test("touch only initiates drag in PLAYING mode", async ({ page }) => {
      await page.goto("");
      await page.waitForFunction(() => document.body.dataset.gameReady === "true", {
        timeout: 15000,
      });

      // Verify we're in MENU mode
      const menuMode = await getGameState(page, "mode");
      expect(menuMode).toBe("MENU");

      // Try to touch on canvas (not on start button)
      const canvas = page.locator("#gameCanvas");
      const box = await canvas.boundingBox();
      if (box) {
        await page.evaluate(
          ({ x, y }) => {
            const canvasEl = document.getElementById("gameCanvas") as HTMLCanvasElement;
            const touchEvent = new TouchEvent("touchstart", {
              bubbles: true,
              cancelable: true,
              touches: [
                new Touch({
                  identifier: 1,
                  target: canvasEl,
                  clientX: x,
                  clientY: y,
                }),
              ],
            });
            canvasEl.dispatchEvent(touchEvent);
          },
          { x: box.x + 50, y: box.y + 50 },
        );

        await page.waitForTimeout(100);
      }

      // Should still be in MENU mode (touch doesn't start game)
      const stillMenuMode = await getGameState(page, "mode");
      expect(stillMenuMode).toBe("MENU");

      // isDragging should be false
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(false);
    });
  });
});
