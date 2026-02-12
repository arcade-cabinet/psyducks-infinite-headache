/**
 * Feature: comprehensive-e2e-testing
 * Property 46: Rapid Input State Consistency
 *
 * For any sequence of rapid inputs (keyboard, mouse, touch), game state SHALL remain
 * consistent without corruption. After any sequence of rapid inputs, game state SHALL
 * remain consistent (no stuck drag state, no invalid duck state).
 *
 * **Validates: Requirements 3.12, 15.2**
 */
import { expect, test } from "@playwright/test";
import { designToScreen, getGameState, startSeededGame, verifyDuckBounds } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "multi-input-test-001";

// ARROW_MOVE_PX constant from game.ts
const ARROW_MOVE_PX = 15;

test.describe("Multi-Input Tests", () => {
  // Skip Firefox for timing-sensitive physics tests (slow rAF in headless mode)
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for multi-input physics tests",
    );
  });

  test.describe("Keyboard then Mouse Sequence", () => {
    // Skip mobile projects for keyboard tests
    test.beforeEach(async ({ page: _page }, testInfo) => {
      test.skip(
        testInfo.project.name.startsWith("mobile"),
        "Keyboard input not available on mobile projects",
      );
    });

    /**
     * Test: Keyboard positioning followed by mouse click drop
     *
     * Validates: Requirements 3.12
     * Property 46: Rapid Input State Consistency
     */
    test("keyboard positioning then mouse click drop works correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial position
      const initialX: number = await getGameState(page, "currentDuck.x");

      // Use keyboard to position duck
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(30);
      }

      // Verify duck moved via keyboard
      const afterKeyboardX: number = await getGameState(page, "currentDuck.x");
      expect(afterKeyboardX).toBeGreaterThan(initialX);

      // Verify duck is still hovering (not falling)
      const beforeClickState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(beforeClickState.isFalling).toBe(false);
      expect(beforeClickState.isStatic).toBe(false);
      expect(beforeClickState.isBeingDragged).toBe(false);

      // Now use mouse click away from duck to trigger drop
      const duckY: number = await getGameState(page, "currentDuck.y");
      const gameWidth: number = await getGameState(page, "width");
      const farAwayX = afterKeyboardX > gameWidth / 2 ? 50 : gameWidth - 50;
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
     * Test: Keyboard positioning followed by mouse drag and release
     *
     * Validates: Requirements 3.12
     * Property 46: Rapid Input State Consistency
     */
    test("keyboard positioning then mouse drag works correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Use keyboard to position duck
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("ArrowLeft");
        await page.waitForTimeout(30);
      }

      // Get position after keyboard movement
      const afterKeyboardX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");

      // Now use mouse to drag the duck
      const screenPos = await designToScreen(page, afterKeyboardX, duckY);
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify drag initiated
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

      // Drag to new position
      const newScreenPos = await designToScreen(page, afterKeyboardX + 60, duckY);
      await page.mouse.move(newScreenPos.x, newScreenPos.y, { steps: 5 });
      await page.waitForTimeout(50);

      // Release to drop
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
     * Test: Mouse drag followed by keyboard input (keyboard should not affect dragged duck)
     *
     * Validates: Requirements 3.12
     * Property 46: Rapid Input State Consistency
     */
    test("mouse drag then keyboard input maintains drag state", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start mouse drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      // Verify drag started
      const isDragging = await getGameState(page, "isDragging");
      expect(isDragging).toBe(true);

      // Get position during drag
      const duringDragX: number = await getGameState(page, "currentDuck.x");

      // Try keyboard input while dragging
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(30);

      // Verify drag state is still active and consistent
      const afterKeyboardState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
          x: gs.currentDuck?.x,
        };
      });

      // Drag state should still be active
      expect(afterKeyboardState.isDragging).toBe(true);
      expect(afterKeyboardState.isBeingDragged).toBe(true);
      expect(afterKeyboardState.isFalling).toBe(false);

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify clean state after release
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
  });

  test.describe("Property 46: Rapid Input State Consistency", () => {
    // Skip mobile projects for keyboard tests
    test.beforeEach(async ({ page: _page }, testInfo) => {
      test.skip(
        testInfo.project.name.startsWith("mobile"),
        "Keyboard input not available on mobile projects",
      );
    });

    /**
     * Test: Rapid keyboard inputs maintain state consistency
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("rapid keyboard inputs maintain state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Perform rapid alternating keyboard inputs
      const rapidInputs = 20;
      for (let i = 0; i < rapidInputs; i++) {
        if (i % 2 === 0) {
          await page.keyboard.press("ArrowRight");
        } else {
          await page.keyboard.press("ArrowLeft");
        }
        // Minimal delay between inputs
        await page.waitForTimeout(10);
      }

      // Verify game state is consistent after rapid inputs
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
          isDragging: gs.isDragging,
        };
      });

      // Game should still be in PLAYING mode
      expect(state.mode).toBe("PLAYING");
      expect(state.hasDuck).toBe(true);

      // Duck should be in valid hover state (not stuck in drag or invalid state)
      expect(state.duckState?.isFalling).toBe(false);
      expect(state.duckState?.isStatic).toBe(false);
      expect(state.duckState?.isBeingDragged).toBe(false);
      expect(state.isDragging).toBe(false);

      // Verify duck position is within bounds
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
    });

    /**
     * Test: Rapid mouse clicks maintain state consistency
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("rapid mouse clicks maintain state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Perform rapid mouse down/up cycles (simulating rapid clicking)
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(screenPos.x, screenPos.y);
        await page.mouse.down();
        await page.waitForTimeout(20);
        await page.mouse.up();
        await page.waitForTimeout(20);
      }

      // Verify game state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
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

      // Game should be in valid state (PLAYING or GAMEOVER if duck fell)
      expect(["PLAYING", "GAMEOVER"]).toContain(state.mode);

      // No stuck drag state
      expect(state.isDragging).toBe(false);

      // If duck exists, it should be in a valid state
      if (state.hasDuck && state.duckState) {
        expect(state.duckState.isBeingDragged).toBe(false);
        // Duck should be either falling, static, or hovering (not multiple states)
        const stateCount = [
          state.duckState.isFalling,
          state.duckState.isStatic,
          !state.duckState.isFalling && !state.duckState.isStatic,
        ].filter(Boolean).length;
        expect(stateCount).toBe(1);
      }
    });

    /**
     * Test: Rapid mixed keyboard and mouse inputs maintain state consistency
     *
     * Validates: Requirements 3.12, 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("rapid mixed keyboard and mouse inputs maintain state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Perform rapid mixed inputs
      for (let i = 0; i < 10; i++) {
        // Alternate between keyboard and mouse
        if (i % 3 === 0) {
          await page.keyboard.press("ArrowRight");
        } else if (i % 3 === 1) {
          await page.keyboard.press("ArrowLeft");
        } else {
          // Quick mouse move (not click)
          await page.mouse.move(screenPos.x + i * 5, screenPos.y);
        }
        await page.waitForTimeout(15);
      }

      // Verify game state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
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

      // Game should still be in PLAYING mode
      expect(state.mode).toBe("PLAYING");
      expect(state.hasDuck).toBe(true);

      // No stuck drag state (mouse moves without click shouldn't initiate drag)
      expect(state.isDragging).toBe(false);
      expect(state.duckState?.isBeingDragged).toBe(false);

      // Duck should be in valid hover state
      expect(state.duckState?.isFalling).toBe(false);
      expect(state.duckState?.isStatic).toBe(false);
    });

    /**
     * Test: Rapid Space key presses maintain state consistency
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("rapid Space key presses maintain state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is hovering
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

      // Rapidly press Space multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Space");
        await page.waitForTimeout(10);
      }

      // Verify game state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
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

      // Game should be in valid state
      expect(["PLAYING", "GAMEOVER"]).toContain(state.mode);

      // No stuck drag state
      expect(state.isDragging).toBe(false);

      // If duck exists and game is playing, duck should be falling (first Space triggered drop)
      if (state.mode === "PLAYING" && state.hasDuck && state.duckState) {
        expect(state.duckState.isBeingDragged).toBe(false);
        // Duck should be falling after Space press
        expect(state.duckState.isFalling).toBe(true);
      }
    });

    /**
     * Test: Interrupted drag with rapid inputs maintains state consistency
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("interrupted drag with rapid inputs maintains state consistency", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(30);

      // Verify drag started
      const dragStarted = await getGameState(page, "isDragging");
      expect(dragStarted).toBe(true);

      // Rapidly move mouse while dragging
      for (let i = 0; i < 10; i++) {
        const offset = i % 2 === 0 ? 20 : -20;
        await page.mouse.move(screenPos.x + offset, screenPos.y, { steps: 2 });
        await page.waitForTimeout(10);
      }

      // Release mouse
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify state is consistent after rapid drag movements
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
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

      // No stuck drag state
      expect(state.isDragging).toBe(false);

      // Duck should be falling after drag release
      if (state.hasDuck && state.duckState) {
        expect(state.duckState.isBeingDragged).toBe(false);
        expect(state.duckState.isFalling).toBe(true);
      }
    });

    /**
     * Test: State consistency after rapid input sequence followed by game over
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("state consistency after rapid inputs and game over", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Perform rapid inputs to move duck to edge
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(10);
      }

      // Drop the duck (likely to miss and cause game over)
      await page.keyboard.press("Space");

      // Wait for result
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.mode === "GAMEOVER" || gs.score > 0;
        },
        { timeout: 15000 },
      );

      // Verify state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
        };
      });

      // No stuck drag state regardless of outcome
      expect(state.isDragging).toBe(false);

      // Game should be in valid state
      expect(["PLAYING", "GAMEOVER"]).toContain(state.mode);
    });
  });

  test.describe("Rapid Input Handling Edge Cases", () => {
    // Skip mobile projects for keyboard tests
    test.beforeEach(async ({ page: _page }, testInfo) => {
      test.skip(
        testInfo.project.name.startsWith("mobile"),
        "Keyboard input not available on mobile projects",
      );
    });

    /**
     * Test: No stuck drag state after rapid mouse down/up without movement
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("no stuck drag state after rapid mouse down/up", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Rapid mouse down/up on duck (very quick clicks)
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(screenPos.x, screenPos.y);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(5);
      }

      await page.waitForTimeout(100);

      // Verify no stuck drag state
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isDragging: gs.isDragging,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(state.isDragging).toBe(false);
      expect(state.isBeingDragged).toBe(false);
    });

    /**
     * Test: No invalid duck state after rapid input mode switches
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("no invalid duck state after rapid input mode switches", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Rapidly switch between input modes
      // 1. Keyboard
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(10);

      // 2. Start drag
      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(10);

      // 3. Keyboard while dragging
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(10);

      // 4. Release drag
      await page.mouse.up();
      await page.waitForTimeout(10);

      // 5. More keyboard
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(10);

      // Verify duck state is valid (not in multiple states simultaneously)
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const duck = gs.currentDuck;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
          hasDuck: !!duck,
          isFalling: duck?.isFalling,
          isStatic: duck?.isStatic,
          isBeingDragged: duck?.isBeingDragged,
        };
      });

      // No stuck drag state
      expect(state.isDragging).toBe(false);
      expect(state.isBeingDragged).toBe(false);

      // Duck should be in exactly one valid state
      if (state.hasDuck) {
        // After drag release, duck should be falling
        expect(state.isFalling).toBe(true);
        expect(state.isStatic).toBe(false);
      }
    });

    /**
     * Test: Consistent state after keyboard spam during hover
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("consistent state after keyboard spam during hover", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Spam all arrow keys rapidly
      const keys = ["ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
      for (let round = 0; round < 5; round++) {
        for (const key of keys) {
          await page.keyboard.press(key);
          // No delay between presses
        }
      }

      await page.waitForTimeout(50);

      // Verify state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
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

      // Game should still be in PLAYING mode
      expect(state.mode).toBe("PLAYING");
      expect(state.hasDuck).toBe(true);

      // Duck should still be hovering (arrow keys don't trigger drop)
      expect(state.duckState?.isFalling).toBe(false);
      expect(state.duckState?.isStatic).toBe(false);
      expect(state.duckState?.isBeingDragged).toBe(false);
      expect(state.isDragging).toBe(false);

      // Verify position is within bounds
      const bounds = await verifyDuckBounds(page);
      expect(bounds.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(bounds.x).toBeLessThanOrEqual(bounds.maxX);
    });

    /**
     * Test: State recovery after interrupted drag sequence
     *
     * Validates: Requirements 15.2
     * Property 46: Rapid Input State Consistency
     */
    test("state recovery after interrupted drag sequence", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get duck position
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      // Start multiple drags without completing them properly
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(screenPos.x + i * 10, screenPos.y);
        await page.mouse.down();
        await page.waitForTimeout(20);
        // Move slightly
        await page.mouse.move(screenPos.x + i * 10 + 30, screenPos.y);
        await page.waitForTimeout(10);
        // Release
        await page.mouse.up();
        await page.waitForTimeout(30);
      }

      // Verify final state is consistent
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          mode: gs.mode,
          isDragging: gs.isDragging,
          hasDuck: !!gs.currentDuck,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      // No stuck drag state
      expect(state.isDragging).toBe(false);
      expect(state.isBeingDragged).toBe(false);

      // Game should be in valid state
      expect(["PLAYING", "GAMEOVER"]).toContain(state.mode);
    });
  });
});
