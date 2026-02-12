/**
 * Feature: comprehensive-e2e-testing
 * Property 10: Click-on-Duck Drag Initiation
 * Property 11: Click-Away Drop Trigger
 * Property 12: Drag Release Drop
 *
 * Property 10: For any mouse click on a hovering duck's hitbox, isDragging SHALL become
 * true and isBeingDragged SHALL become true.
 *
 * Property 11: For any mouse click outside a hovering duck's hitbox, isFalling SHALL
 * become true.
 *
 * Property 12: For any drag operation that ends (mouseup/touchend), isBeingDragged SHALL
 * become false and isFalling SHALL become true.
 *
 * **Validates: Requirements 3.4, 3.5, 3.6**
 */
import { expect, test } from "@playwright/test";
import { designToScreen, getGameState, startSeededGame, verifyDuckBounds } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "mouse-input-test-001";

test.describe("Mouse Input Tests", () => {
  // Skip Firefox for timing-sensitive physics tests (slow rAF in headless mode)
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for mouse input physics tests",
    );
  });

  test.describe("Property 10: Click-on-Duck Drag Initiation", () => {
    /**
     * Test: Click on duck initiates drag - isDragging and isBeingDragged become true
     *
     * Validates: Requirements 3.4
     * Property 10: Click-on-Duck Drag Initiation
     */
    test("click on duck sets isDragging=true and isBeingDragged=true", async ({ page }) => {
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

      // Click on the duck (mouse down)
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify drag state is now active
      const afterClickState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterClickState.isDragging).toBe(true);
      expect(afterClickState.isBeingDragged).toBe(true);
      expect(afterClickState.isFalling).toBe(false);

      // Release mouse to clean up
      await page.mouse.up();
    });

    /**
     * Test: Click on duck's tummy area initiates drag
     *
     * Validates: Requirements 3.4
     * Property 10: Click-on-Duck Drag Initiation
     */
    test("click on duck tummy area initiates drag", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position (center is the tummy area)
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Click on the duck center (tummy)
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify drag initiated
      const isDragging = await getGameState(page, "isDragging");
      const isBeingDragged = await getGameState(page, "currentDuck.isBeingDragged");

      expect(isDragging).toBe(true);
      expect(isBeingDragged).toBe(true);

      // Release mouse
      await page.mouse.up();
    });

    /**
     * Test: Duck does not fall while being dragged
     *
     * Validates: Requirements 3.4
     * Property 10: Click-on-Duck Drag Initiation
     */
    test("duck does not fall while being dragged", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
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

      // Release mouse
      await page.mouse.up();
    });

    /**
     * Test: Drag allows repositioning duck horizontally
     *
     * Validates: Requirements 3.4
     * Property 10: Click-on-Duck Drag Initiation
     */
    test("drag allows repositioning duck horizontally", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Drag to the right
      const newScreenPos = await designToScreen(page, duckX + 100, duckY);
      await page.mouse.move(newScreenPos.x, newScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // Verify duck moved
      const newDuckX: number = await getGameState(page, "currentDuck.x");
      expect(newDuckX).toBeGreaterThan(duckX);

      // Release mouse
      await page.mouse.up();
    });
  });

  test.describe("Property 11: Click-Away Drop Trigger", () => {
    /**
     * Test: Click away from duck triggers drop - isFalling becomes true
     *
     * Validates: Requirements 3.5
     * Property 11: Click-Away Drop Trigger
     */
    test("click away from duck sets isFalling=true", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is in hover state
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(initialState.isFalling).toBe(false);
      expect(initialState.isStatic).toBe(false);

      // Get duck position and game dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const gameWidth: number = await getGameState(page, "width");

      // Click far away from the duck (at the edge of the screen)
      const farAwayX = duckX > gameWidth / 2 ? 50 : gameWidth - 50;
      const screenPos = await designToScreen(page, farAwayX, duckY + 100);

      await page.mouse.click(screenPos.x, screenPos.y);
      await page.waitForTimeout(50);

      // Verify duck is now falling
      const afterClickState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isDragging: gs.isDragging,
        };
      });

      expect(afterClickState.isFalling).toBe(true);
      expect(afterClickState.isDragging).toBe(false);
    });

    /**
     * Test: Click below duck triggers drop
     *
     * Validates: Requirements 3.5
     * Property 11: Click-Away Drop Trigger
     */
    test("click below duck triggers drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const duckH: number = await getGameState(page, "currentDuck.h");

      // Click well below the duck (outside its hitbox)
      const belowDuckY = duckY + duckH + 100;
      const screenPos = await designToScreen(page, duckX, belowDuckY);

      // Verify duck is not falling initially
      const initialFalling = await getGameState(page, "currentDuck.isFalling");
      expect(initialFalling).toBe(false);

      await page.mouse.click(screenPos.x, screenPos.y);
      await page.waitForTimeout(50);

      // Verify duck is now falling
      const isFalling = await getGameState(page, "currentDuck.isFalling");
      expect(isFalling).toBe(true);
    });

    /**
     * Test: Click to the side of duck triggers drop
     *
     * Validates: Requirements 3.5
     * Property 11: Click-Away Drop Trigger
     */
    test("click to the side of duck triggers drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position and dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const duckW: number = await getGameState(page, "currentDuck.w");

      // Click far to the right of the duck (outside its hitbox)
      const sideX = duckX + duckW + 50;
      const screenPos = await designToScreen(page, sideX, duckY);

      // Verify duck is not falling initially
      const initialFalling = await getGameState(page, "currentDuck.isFalling");
      expect(initialFalling).toBe(false);

      await page.mouse.click(screenPos.x, screenPos.y);
      await page.waitForTimeout(50);

      // Verify duck is now falling
      const isFalling = await getGameState(page, "currentDuck.isFalling");
      expect(isFalling).toBe(true);
    });

    /**
     * Test: Click away does not initiate drag
     *
     * Validates: Requirements 3.5
     * Property 11: Click-Away Drop Trigger
     */
    test("click away does not initiate drag", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position and game dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const duckW: number = await getGameState(page, "currentDuck.w");
      const gameWidth: number = await getGameState(page, "width");

      // Click to the side of the duck but within canvas bounds
      // Use a position that's clearly outside the duck but still in the game area
      const clickX = Math.min(duckX + duckW + 50, gameWidth - 10);
      const screenPos = await designToScreen(page, clickX, duckY);

      await page.mouse.click(screenPos.x, screenPos.y);
      await page.waitForTimeout(50);

      // Verify drag was not initiated
      const state = await page.evaluate(() => {
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
    });

    /**
     * Test: Click away only works in PLAYING mode
     *
     * Validates: Requirements 3.5
     * Property 11: Click-Away Drop Trigger
     */
    test("click away only triggers drop in PLAYING mode", async ({ page }) => {
      await page.goto("");
      await page.waitForFunction(() => document.body.dataset.gameReady === "true", {
        timeout: 15000,
      });

      // Verify we're in MENU mode
      const menuMode = await getGameState(page, "mode");
      expect(menuMode).toBe("MENU");

      // Click somewhere on the canvas (not on start button)
      const canvas = page.locator("#gameCanvas");
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 50, box.y + 50);
        await page.waitForTimeout(100);
      }

      // Should still be in MENU mode (click doesn't start game)
      const stillMenuMode = await getGameState(page, "mode");
      expect(stillMenuMode).toBe("MENU");
    });
  });

  test.describe("Property 12: Drag Release Drop", () => {
    /**
     * Test: Releasing mouse after drag triggers drop - isBeingDragged=false, isFalling=true
     *
     * Validates: Requirements 3.6
     * Property 12: Drag Release Drop
     */
    test("drag release sets isBeingDragged=false and isFalling=true", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
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

      // Release mouse (end drag)
      await page.mouse.up();
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
     * Test: Drag release triggers drop immediately
     *
     * Validates: Requirements 3.6
     * Property 12: Drag Release Drop
     */
    test("drag release triggers drop immediately without delay", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify not falling during drag
      const beforeRelease = await getGameState(page, "currentDuck.isFalling");
      expect(beforeRelease).toBe(false);

      // Release mouse
      await page.mouse.up();

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

    /**
     * Test: Drag release preserves duck position
     *
     * Validates: Requirements 3.6
     * Property 12: Drag Release Drop
     */
    test("drag release preserves duck x-position", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Drag to a new position
      const newX = duckX + 80;
      const newScreenPos = await designToScreen(page, newX, duckY);
      await page.mouse.move(newScreenPos.x, newScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // Get position before release
      const positionBeforeRelease: number = await getGameState(page, "currentDuck.x");

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Get position after release
      const positionAfterRelease: number = await getGameState(page, "currentDuck.x");

      // X position should be preserved (duck falls from where it was released)
      expect(positionAfterRelease).toBe(positionBeforeRelease);
    });

    /**
     * Test: Drag release at boundary still triggers drop
     *
     * Validates: Requirements 3.6
     * Property 12: Drag Release Drop
     */
    test("drag release at boundary triggers drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position and game dimensions
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify drag started
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(true);

      // Drag to the right (staying within canvas bounds)
      // Move 100 pixels to the right from current position
      const newScreenPos = await designToScreen(page, duckX + 100, duckY);
      await page.mouse.move(newScreenPos.x, newScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // Verify duck is still being dragged (may have been clamped at boundary)
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);

      // Release
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify duck is now falling
      const afterRelease = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isDragging: gs.isDragging,
        };
      });

      expect(afterRelease.isFalling).toBe(true);
      expect(afterRelease.isBeingDragged).toBe(false);
      expect(afterRelease.isDragging).toBe(false);
    });

    /**
     * Test: Multiple drag and release cycles work correctly
     *
     * Validates: Requirements 3.6
     * Property 12: Drag Release Drop
     */
    test("multiple drag and release cycles work correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Perform multiple drag-release cycles (landing duck each time)
      for (let cycle = 0; cycle < 2; cycle++) {
        // Wait for a hovering duck
        await page.waitForFunction(
          () => {
            // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
            const gs = (window as any).__gameState;
            return (
              gs.mode === "PLAYING" &&
              gs.currentDuck &&
              !gs.currentDuck.isFalling &&
              !gs.currentDuck.isStatic
            );
          },
          { timeout: 15000 },
        );

        // Get duck position
        const duckX: number = await getGameState(page, "currentDuck.x");
        const duckY: number = await getGameState(page, "currentDuck.y");
        const screenPos = await designToScreen(page, duckX, duckY);

        // Start drag
        await page.mouse.move(screenPos.x, screenPos.y);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Verify drag started
        const isDragging = await getGameState(page, "isDragging");
        expect(isDragging).toBe(true);

        // Move slightly
        await page.mouse.move(screenPos.x + 20, screenPos.y, { steps: 5 });
        await page.waitForTimeout(30);

        // Release
        await page.mouse.up();
        await page.waitForTimeout(50);

        // Verify duck is falling
        const isFalling = await getGameState(page, "currentDuck.isFalling");
        expect(isFalling).toBe(true);

        // Wait for duck to land or game over
        await page.waitForFunction(
          () => {
            // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
            const gs = (window as any).__gameState;
            return (
              gs.mode === "GAMEOVER" ||
              (gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic)
            );
          },
          { timeout: 15000 },
        );

        const mode = await getGameState(page, "mode");
        if (mode === "GAMEOVER") {
          break;
        }
      }
    });
  });

  test.describe("Combined Mouse Input Tests", () => {
    /**
     * Test: Drag then release positions duck correctly before drop
     *
     * Validates: Requirements 3.4, 3.5, 3.6
     * Property 10, Property 11, Property 12
     */
    test("drag positions duck before release drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial duck position
      const initialX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, initialX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Drag to a new position (move right)
      const targetX = initialX + 60;
      const targetScreenPos = await designToScreen(page, targetX, duckY);
      await page.mouse.move(targetScreenPos.x, targetScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // Verify duck moved
      const movedX: number = await getGameState(page, "currentDuck.x");
      expect(movedX).toBeGreaterThan(initialX);

      // Verify still being dragged (not falling)
      const stillDragging = await getGameState(page, "currentDuck.isBeingDragged");
      expect(stillDragging).toBe(true);

      // Release to drop
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify duck is now falling from the new position
      const afterRelease = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          x: gs.currentDuck?.x,
        };
      });

      expect(afterRelease.isFalling).toBe(true);
      expect(afterRelease.x).toBe(movedX);
    });

    /**
     * Test: Mouse input state consistency after multiple operations
     *
     * Validates: Requirements 3.4, 3.5, 3.6
     * Property 10, Property 11, Property 12
     */
    test("mouse input maintains state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Perform drag operation
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Move around
      await page.mouse.move(screenPos.x + 50, screenPos.y, { steps: 5 });
      await page.waitForTimeout(30);
      await page.mouse.move(screenPos.x - 30, screenPos.y, { steps: 5 });
      await page.waitForTimeout(30);

      // Verify state is consistent during drag
      const duringDrag = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(duringDrag.mode).toBe("PLAYING");
      expect(duringDrag.isDragging).toBe(true);
      expect(duringDrag.isBeingDragged).toBe(true);
      expect(duringDrag.isFalling).toBe(false);
      expect(duringDrag.isStatic).toBe(false);

      // Release
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify state after release
      const afterRelease = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterRelease.mode).toBe("PLAYING");
      expect(afterRelease.isDragging).toBe(false);
      expect(afterRelease.isBeingDragged).toBe(false);
      expect(afterRelease.isFalling).toBe(true);
    });

    /**
     * Test: Click away vs click on duck distinction
     *
     * Validates: Requirements 3.4, 3.5
     * Property 10, Property 11
     */
    test("click on duck vs click away have different behaviors", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");

      // Click ON the duck (should initiate drag, not drop)
      const onDuckScreen = await designToScreen(page, duckX, duckY);
      await page.mouse.move(onDuckScreen.x, onDuckScreen.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      const afterClickOnDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      // Click on duck should start drag, not drop
      expect(afterClickOnDuck.isDragging).toBe(true);
      expect(afterClickOnDuck.isBeingDragged).toBe(true);
      expect(afterClickOnDuck.isFalling).toBe(false);

      // Release to reset state
      await page.mouse.up();

      // Wait for duck to land and new duck to spawn
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return (
            gs.mode === "GAMEOVER" ||
            (gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic)
          );
        },
        { timeout: 15000 },
      );

      const mode = await getGameState(page, "mode");
      if (mode === "GAMEOVER") {
        return; // Can't continue test if game over
      }

      await page.waitForTimeout(300);

      // Now click AWAY from the duck (should trigger drop immediately)
      const newDuckX: number = await getGameState(page, "currentDuck.x");
      const newDuckY: number = await getGameState(page, "currentDuck.y");

      // Click far away from duck
      const awayScreen = await designToScreen(page, newDuckX + 200, newDuckY + 150);
      await page.mouse.click(awayScreen.x, awayScreen.y);
      await page.waitForTimeout(50);

      const afterClickAway = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      // Click away should trigger drop, not drag
      expect(afterClickAway.isDragging).toBe(false);
      expect(afterClickAway.isBeingDragged).toBe(false);
      expect(afterClickAway.isFalling).toBe(true);
    });

    /**
     * Test: Rapid mouse operations maintain correct state
     *
     * Validates: Requirements 3.4, 3.5, 3.6
     * Property 10, Property 11, Property 12
     */
    test("rapid mouse operations maintain correct state", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Rapid mouse down/up on duck
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(50);

      // After rapid click-release on duck, duck should be falling
      const afterRapid = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      // Drag should be ended and duck should be falling
      expect(afterRapid.isDragging).toBe(false);
      expect(afterRapid.isBeingDragged).toBe(false);
      expect(afterRapid.isFalling).toBe(true);
    });
  });
});
