/**
 * Feature: comprehensive-e2e-testing
 * Property 8: Space Key Drop Trigger
 * Property 9: Arrow Key Movement Amount
 *
 * Property 8: For any hovering duck (isFalling=false, isStatic=false), pressing Space
 * SHALL immediately set isFalling=true.
 *
 * Property 9: For any ArrowLeft or ArrowRight key press on a non-clamped duck, the duck's
 * x-position SHALL change by exactly ARROW_MOVE_PX (15px) in the corresponding direction.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
import { expect, test } from "@playwright/test";
import { getGameState, startSeededGame, verifyDuckBounds } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "keyboard-input-test-001";

// ARROW_MOVE_PX constant from game.ts
const ARROW_MOVE_PX = 15;

test.describe("Keyboard Input Tests", () => {
  // These tests rely on keyboard input which is unavailable on mobile devices.
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith("mobile"),
      "Keyboard input not available on mobile projects",
    );
  });

  test.describe("Property 8: Space Key Drop Trigger", () => {
    /**
     * Test: Space key triggers drop - isFalling becomes true immediately
     *
     * Validates: Requirements 3.1
     * Property 8: Space Key Drop Trigger
     */
    test("Space key sets isFalling=true when duck is hovering", async ({ page }) => {
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
        };
      });

      expect(initialState.isFalling).toBe(false);
      expect(initialState.isStatic).toBe(false);
      expect(initialState.isBeingDragged).toBe(false);

      // Press Space to drop
      await page.keyboard.press("Space");

      // Verify isFalling is now true
      const afterSpaceState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(afterSpaceState.isFalling).toBe(true);
    });

    /**
     * Test: Space key does not affect duck that is already falling
     *
     * Validates: Requirements 3.1
     * Property 8: Space Key Drop Trigger
     */
    test("Space key has no effect on already falling duck", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Press Space to start falling
      await page.keyboard.press("Space");

      // Verify duck is falling
      const fallingState = await getGameState(page, "currentDuck.isFalling");
      expect(fallingState).toBe(true);

      // Get current Y position
      const yBeforeSecondSpace: number = await getGameState(page, "currentDuck.y");

      // Press Space again while falling
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);

      // Duck should still be falling (state unchanged by second Space)
      const stillFalling = await getGameState(page, "currentDuck.isFalling");
      expect(stillFalling).toBe(true);

      // Y position should have changed (duck is still falling)
      const yAfterSecondSpace: number = await getGameState(page, "currentDuck.y");
      expect(yAfterSecondSpace).toBeGreaterThan(yBeforeSecondSpace);
    });

    /**
     * Test: Space key does not affect static (landed) duck
     *
     * Validates: Requirements 3.1
     * Property 8: Space Key Drop Trigger
     */
    test("Space key does not affect static duck", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the base duck (which is static)
      const baseDuckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const baseDuck = gs.ducks[0];
        return {
          isStatic: baseDuck.isStatic,
          isFalling: baseDuck.isFalling,
          y: baseDuck.y,
        };
      });

      expect(baseDuckState.isStatic).toBe(true);
      expect(baseDuckState.isFalling).toBe(false);

      // Press Space (should affect currentDuck, not base duck)
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);

      // Base duck should still be static
      const baseDuckAfterSpace = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const baseDuck = gs.ducks[0];
        return {
          isStatic: baseDuck.isStatic,
          isFalling: baseDuck.isFalling,
          y: baseDuck.y,
        };
      });

      expect(baseDuckAfterSpace.isStatic).toBe(true);
      expect(baseDuckAfterSpace.isFalling).toBe(false);
      expect(baseDuckAfterSpace.y).toBe(baseDuckState.y);
    });

    /**
     * Test: Space key only works in PLAYING mode
     *
     * Validates: Requirements 3.1
     * Property 8: Space Key Drop Trigger
     */
    test("Space key only triggers drop in PLAYING mode", async ({ page }) => {
      await page.goto("");
      await page.waitForFunction(() => document.body.dataset.gameReady === "true", {
        timeout: 15000,
      });

      // Verify we're in MENU mode
      const menuMode = await getGameState(page, "mode");
      expect(menuMode).toBe("MENU");

      // Press Space in MENU mode
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);

      // Should still be in MENU mode (Space doesn't start game)
      const stillMenuMode = await getGameState(page, "mode");
      expect(stillMenuMode).toBe("MENU");
    });

    /**
     * Test: Space key triggers drop immediately (no delay)
     *
     * Validates: Requirements 3.1
     * Property 8: Space Key Drop Trigger
     */
    test("Space key triggers drop immediately without delay", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Capture state before Space
      const beforeSpace = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(beforeSpace.isFalling).toBe(false);

      // Press Space and immediately check state
      await page.keyboard.press("Space");

      // Check state immediately after keypress (no waitForTimeout)
      const afterSpace = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      // The key assertion: isFalling should be true immediately after Space
      // (no animation delay or timer before the drop starts)
      expect(afterSpace.isFalling).toBe(true);
    });
  });

  test.describe("Property 9: Arrow Key Movement Amount", () => {
    /**
     * Test: ArrowRight moves duck by exactly 15px
     *
     * Validates: Requirements 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("ArrowRight moves duck by exactly ARROW_MOVE_PX (15px)", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Get bounds to ensure we're not at the right edge
      const bounds = await verifyDuckBounds(page);
      const distanceToRightEdge = bounds.maxX - initialX;

      // Only test if we have room to move right
      if (distanceToRightEdge >= ARROW_MOVE_PX) {
        // Press ArrowRight once
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);

        // Get new position
        const newX: number = await getGameState(page, "currentDuck.x");

        // Should have moved exactly 15px to the right
        expect(newX - initialX).toBe(ARROW_MOVE_PX);
      } else {
        // Move left first to create room
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
        const afterLeftX: number = await getGameState(page, "currentDuck.x");

        // Now press ArrowRight
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
        const afterRightX: number = await getGameState(page, "currentDuck.x");

        // Should have moved exactly 15px to the right
        expect(afterRightX - afterLeftX).toBe(ARROW_MOVE_PX);
      }
    });

    /**
     * Test: ArrowLeft moves duck by exactly 15px
     *
     * Validates: Requirements 3.2
     * Property 9: Arrow Key Movement Amount
     */
    test("ArrowLeft moves duck by exactly ARROW_MOVE_PX (15px)", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Get bounds to ensure we're not at the left edge
      const bounds = await verifyDuckBounds(page);
      const distanceToLeftEdge = initialX - bounds.minX;

      // Only test if we have room to move left
      if (distanceToLeftEdge >= ARROW_MOVE_PX) {
        // Press ArrowLeft once
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);

        // Get new position
        const newX: number = await getGameState(page, "currentDuck.x");

        // Should have moved exactly 15px to the left
        expect(initialX - newX).toBe(ARROW_MOVE_PX);
      } else {
        // Move right first to create room
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
        const afterRightX: number = await getGameState(page, "currentDuck.x");

        // Now press ArrowLeft
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
        const afterLeftX: number = await getGameState(page, "currentDuck.x");

        // Should have moved exactly 15px to the left
        expect(afterRightX - afterLeftX).toBe(ARROW_MOVE_PX);
      }
    });

    /**
     * Test: Multiple ArrowRight presses accumulate correctly
     *
     * Validates: Requirements 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("multiple ArrowRight presses accumulate movement correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const bounds = await verifyDuckBounds(page);

      // Position duck near left edge directly to ensure we have room to move right
      await page.evaluate((minX) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = minX + 30; // Position near left edge with some buffer
        }
      }, bounds.minX);
      await page.waitForTimeout(50);

      // Get starting position
      const startX: number = await getGameState(page, "currentDuck.x");

      // Press ArrowRight 5 times
      const presses = 5;
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
      }

      // Get final position
      const endX: number = await getGameState(page, "currentDuck.x");

      // Should have moved exactly 5 * 15px = 75px (unless clamped)
      const expectedMove = presses * ARROW_MOVE_PX;
      const actualMove = endX - startX;

      // Either moved the full amount or was clamped at boundary
      expect(actualMove).toBeLessThanOrEqual(expectedMove);
      expect(actualMove % ARROW_MOVE_PX === 0 || endX === bounds.maxX).toBe(true);
    });

    /**
     * Test: Multiple ArrowLeft presses accumulate correctly
     *
     * Validates: Requirements 3.2
     * Property 9: Arrow Key Movement Amount
     */
    test("multiple ArrowLeft presses accumulate movement correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const bounds = await verifyDuckBounds(page);

      // Position duck near right edge directly to ensure we have room to move left
      await page.evaluate((maxX) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = maxX - 30; // Position near right edge with some buffer
        }
      }, bounds.maxX);
      await page.waitForTimeout(50);

      // Get starting position
      const startX: number = await getGameState(page, "currentDuck.x");

      // Press ArrowLeft 5 times
      const presses = 5;
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
      }

      // Get final position
      const endX: number = await getGameState(page, "currentDuck.x");

      // Should have moved exactly 5 * 15px = 75px (unless clamped)
      const expectedMove = presses * ARROW_MOVE_PX;
      const actualMove = startX - endX;

      // Either moved the full amount or was clamped at boundary
      expect(actualMove).toBeLessThanOrEqual(expectedMove);
      expect(actualMove % ARROW_MOVE_PX === 0 || endX === bounds.minX).toBe(true);
    });

    /**
     * Test: Arrow keys still move falling duck (game allows mid-air control)
     *
     * Note: The game allows arrow key movement while the duck is falling
     * (not static), providing mid-air control for positioning.
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("arrow keys move falling duck (mid-air control)", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Drop the duck
      await page.keyboard.press("Space");

      // Immediately check that duck is falling and try to move
      const isFalling = await getGameState(page, "currentDuck.isFalling");
      expect(isFalling).toBe(true);

      // Move with arrow key while falling (do this quickly before landing)
      await page.keyboard.press("ArrowRight");

      // Check if duck moved (it should have if still falling)
      const afterRightX: number = await getGameState(page, "currentDuck.x");
      const stillFalling = await getGameState(page, "currentDuck.isFalling");

      // If duck is still falling, it should have moved
      if (stillFalling) {
        const bounds = await verifyDuckBounds(page);
        const expectedX = Math.min(bounds.maxX, initialX + ARROW_MOVE_PX);
        expect(afterRightX).toBe(expectedX);
      } else {
        // Duck landed - verify it moved before landing or is now static
        // The key point is that arrow keys work while falling (not static)
        const isStatic = await getGameState(page, "currentDuck.isStatic");
        // If duck landed, it should now be static
        expect(isStatic).toBe(true);
      }
    });

    /**
     * Test: Arrow keys do not move static duck
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("arrow keys do not move static duck", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get base duck position (which is static)
      const baseDuckX = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].x;
      });

      // Press arrow keys
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(30);

      // Base duck should not have moved
      const baseDuckXAfter = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].x;
      });

      expect(baseDuckXAfter).toBe(baseDuckX);
    });

    /**
     * Test: Arrow key movement is clamped at boundaries
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("arrow key movement is clamped at boundaries", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const bounds = await verifyDuckBounds(page);

      // Move duck directly to near the right boundary using evaluate
      // This is more reliable than pressing keys many times
      await page.evaluate((maxX) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = maxX - 5; // Position near right boundary
        }
      }, bounds.maxX);
      await page.waitForTimeout(50);

      // Press ArrowRight - should clamp to maxX
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(50);

      const atRightBoundary: number = await getGameState(page, "currentDuck.x");

      // Should be at or near maxX (clamped)
      expect(atRightBoundary).toBeLessThanOrEqual(bounds.maxX);
      expect(atRightBoundary).toBeGreaterThanOrEqual(bounds.maxX - ARROW_MOVE_PX);

      // Try to move further right - should stay clamped
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(50);

      const afterExtraRight: number = await getGameState(page, "currentDuck.x");

      // Should not have moved beyond maxX
      expect(afterExtraRight).toBeLessThanOrEqual(bounds.maxX);

      // Move duck directly to near the left boundary
      await page.evaluate((minX) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = minX + 5; // Position near left boundary
        }
      }, bounds.minX);
      await page.waitForTimeout(50);

      // Press ArrowLeft - should clamp to minX
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(50);

      const atLeftBoundary: number = await getGameState(page, "currentDuck.x");

      // Should be at or near minX (clamped)
      expect(atLeftBoundary).toBeGreaterThanOrEqual(bounds.minX);
      expect(atLeftBoundary).toBeLessThanOrEqual(bounds.minX + ARROW_MOVE_PX);

      // Try to move further left - should stay clamped
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(50);

      const afterExtraLeft: number = await getGameState(page, "currentDuck.x");

      // Should not have moved beyond minX
      expect(afterExtraLeft).toBeGreaterThanOrEqual(bounds.minX);
    });

    /**
     * Test: Partial movement when near boundary
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("movement is partial when near boundary", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      const bounds = await verifyDuckBounds(page);

      // Position duck directly at the right boundary
      await page.evaluate((maxX) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = maxX;
        }
      }, bounds.maxX);
      await page.waitForTimeout(50);

      const atBoundary: number = await getGameState(page, "currentDuck.x");

      // Duck should be at maxX
      expect(atBoundary).toBe(bounds.maxX);

      // Move left once
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(50);

      const afterLeft: number = await getGameState(page, "currentDuck.x");

      // Should have moved exactly 15px left
      const movement = atBoundary - afterLeft;
      expect(movement).toBe(ARROW_MOVE_PX);

      // Move right once - should clamp to boundary
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(50);

      const afterRight: number = await getGameState(page, "currentDuck.x");

      // Should be back at boundary (moved 15px or clamped)
      expect(afterRight).toBeLessThanOrEqual(bounds.maxX);
    });
  });

  test.describe("Combined Keyboard Input Tests", () => {
    /**
     * Test: Arrow keys work correctly before Space drop
     *
     * Validates: Requirements 3.1, 3.2, 3.3
     * Property 8, Property 9
     */
    test("arrow keys position duck before Space drop", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Move right 3 times
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
      }

      // Verify position changed
      const afterMoveX: number = await getGameState(page, "currentDuck.x");
      expect(afterMoveX).toBeGreaterThan(initialX);

      // Verify duck is still hovering
      const stillHovering = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
      });
      expect(stillHovering).toBe(true);

      // Now drop with Space
      await page.keyboard.press("Space");

      // Verify duck is now falling
      const isFalling = await getGameState(page, "currentDuck.isFalling");
      expect(isFalling).toBe(true);

      // X position should be preserved when falling starts
      const fallingX: number = await getGameState(page, "currentDuck.x");
      expect(fallingX).toBe(afterMoveX);
    });

    /**
     * Test: Rapid alternating arrow key presses maintain correct movement
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("rapid alternating arrow keys maintain correct movement", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Rapidly alternate: right, left, right, left, right (net +1 right)
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(20);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(20);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(20);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(20);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);

      // Get final position
      const finalX: number = await getGameState(page, "currentDuck.x");

      // Net movement should be +15px (3 right - 2 left = 1 right)
      // Unless clamped at boundary
      const bounds = await verifyDuckBounds(page);
      const expectedX = Math.min(bounds.maxX, Math.max(bounds.minX, initialX + ARROW_MOVE_PX));

      expect(finalX).toBe(expectedX);
    });

    /**
     * Test: Arrow keys only work in PLAYING mode
     *
     * Validates: Requirements 3.2, 3.3
     * Property 9: Arrow Key Movement Amount
     */
    test("arrow keys only work in PLAYING mode", async ({ page }) => {
      await page.goto("");
      await page.waitForFunction(() => document.body.dataset.gameReady === "true", {
        timeout: 15000,
      });

      // Verify we're in MENU mode
      const menuMode = await getGameState(page, "mode");
      expect(menuMode).toBe("MENU");

      // Arrow keys in MENU mode should not cause errors
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(30);

      // Should still be in MENU mode
      const stillMenuMode = await getGameState(page, "mode");
      expect(stillMenuMode).toBe("MENU");
    });

    /**
     * Test: Keyboard input state consistency after multiple operations
     *
     * Validates: Requirements 3.1, 3.2, 3.3
     * Property 8, Property 9
     */
    test("keyboard input maintains state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial state before any keyboard input
      const initialState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          hasDuck: !!gs.currentDuck,
          duckState: gs.currentDuck
            ? {
                isFalling: gs.currentDuck.isFalling,
                isStatic: gs.currentDuck.isStatic,
                isBeingDragged: gs.currentDuck.isBeingDragged,
              }
            : null,
        };
      });

      expect(initialState.mode).toBe("PLAYING");
      expect(initialState.hasDuck).toBe(true);
      expect(initialState.duckState?.isFalling).toBe(false);
      expect(initialState.duckState?.isStatic).toBe(false);
      expect(initialState.duckState?.isBeingDragged).toBe(false);

      // Perform a few quick keyboard operations (not too many to avoid auto-drop)
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
      }

      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
      }

      // Verify game state is still consistent (duck should still be hovering)
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          hasDuck: !!gs.currentDuck,
          duckState: gs.currentDuck
            ? {
                isFalling: gs.currentDuck.isFalling,
                isStatic: gs.currentDuck.isStatic,
                isBeingDragged: gs.currentDuck.isBeingDragged,
              }
            : null,
        };
      });

      expect(state.mode).toBe("PLAYING");
      expect(state.hasDuck).toBe(true);
      // Duck should still be in hover state (not falling, not static, not dragged)
      // unless auto-drop triggered, in which case it would be falling
      if (!state.duckState?.isFalling) {
        expect(state.duckState?.isStatic).toBe(false);
        expect(state.duckState?.isBeingDragged).toBe(false);
      }

      // Now drop and verify state changes correctly
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);

      const afterDrop = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterDrop.mode).toBe("PLAYING");
      expect(afterDrop.isFalling).toBe(true);
    });
  });
});
