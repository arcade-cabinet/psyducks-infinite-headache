/**
 * Feature: comprehensive-e2e-testing
 * Tests for duck state machine transitions
 *
 * Properties covered:
 * - Property 49: Duck Initial State
 * - Property 50: Duck Drag State
 * - Property 51: Duck Landed State
 *
 * **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6**
 */
import { expect, test } from "@playwright/test";
import {
  designToScreen,
  dropAndWaitForResult,
  getGameState,
  positionDuckOverStack,
  startSeededGame,
  waitForNewDuck,
} from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "duck-states-test-001";

test.describe("Duck State Machine Tests", () => {
  // Skip on mobile (no keyboard) and Firefox (slow rAF timing)
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

  test.describe("Property 49: Duck Initial State", () => {
    /**
     * Test: Newly spawned duck has correct initial state
     *
     * For any newly spawned duck, isFalling SHALL be false, isStatic SHALL be false,
     * and isBeingDragged SHALL be false.
     *
     * Validates: Requirements 17.1
     */
    test("newly spawned duck has isFalling=false, isStatic=false, isBeingDragged=false", async ({
      page,
    }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial duck state
      const duckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          exists: gs.currentDuck !== null,
        };
      });

      expect(duckState.exists).toBe(true);
      expect(duckState.isFalling).toBe(false);
      expect(duckState.isStatic).toBe(false);
      expect(duckState.isBeingDragged).toBe(false);
    });

    /**
     * Test: Duck spawns in hover state (ready for player input)
     *
     * Validates: Requirements 17.1
     */
    test("duck spawns in hover state ready for player input", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is in hover state (not falling, not static, not being dragged)
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const duck = gs.currentDuck;
        return {
          isFalling: duck?.isFalling,
          isStatic: duck?.isStatic,
          isBeingDragged: duck?.isBeingDragged,
          // Hover state means: not falling, not static, not being dragged
          isHovering: duck && !duck.isFalling && !duck.isStatic && !duck.isBeingDragged,
        };
      });

      expect(state.isHovering).toBe(true);
    });

    /**
     * Test: Duck Y position doesn't change while in initial hover state
     *
     * Validates: Requirements 17.1
     */
    test("duck Y position remains stable in initial hover state", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial Y position
      const initialY: number = await getGameState(page, "currentDuck.y");

      // Wait a bit
      await page.waitForTimeout(200);

      // Y should not have changed (duck is hovering, not falling)
      const afterWaitY: number = await getGameState(page, "currentDuck.y");
      expect(afterWaitY).toBe(initialY);
    });

    /**
     * Test: New duck spawns with correct initial state after landing
     *
     * Validates: Requirements 17.1
     */
    test("new duck spawns with correct initial state after previous duck lands", async ({
      page,
    }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Position and drop the first duck
      await positionDuckOverStack(page, 0);
      const result = await dropAndWaitForResult(page, 0);

      // If game over, skip the rest of the test
      if (result.mode === "GAMEOVER") {
        return;
      }

      // Wait for new duck to spawn
      await waitForNewDuck(page);

      // Verify new duck has correct initial state
      const newDuckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(newDuckState.isFalling).toBe(false);
      expect(newDuckState.isStatic).toBe(false);
      expect(newDuckState.isBeingDragged).toBe(false);
    });

    /**
     * Test: Duck velocity is initialized but duck doesn't move until drop
     *
     * Validates: Requirements 17.1
     */
    test("duck has velocity but does not move until drop triggered", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck has velocity property but is not falling
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          velocity: gs.currentDuck?.velocity,
          isFalling: gs.currentDuck?.isFalling,
          y: gs.currentDuck?.y,
        };
      });

      // Duck should have velocity (gravity) but not be falling
      expect(state.velocity).toBeGreaterThan(0);
      expect(state.isFalling).toBe(false);

      // Wait and verify Y hasn't changed
      await page.waitForTimeout(200);
      const yAfterWait: number = await getGameState(page, "currentDuck.y");
      expect(yAfterWait).toBe(state.y);
    });
  });

  test.describe("Property 50: Duck Drag State", () => {
    /**
     * Test: During drag, duck has isBeingDragged=true and isFalling=false
     *
     * For any duck being dragged, isBeingDragged SHALL be true and isFalling SHALL be false.
     *
     * Validates: Requirements 17.2
     */
    test("during drag, duck has isBeingDragged=true and isFalling=false", async ({ page }) => {
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

      // Verify drag state
      const dragState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
          isDragging: gs.isDragging,
        };
      });

      expect(dragState.isBeingDragged).toBe(true);
      expect(dragState.isFalling).toBe(false);
      expect(dragState.isDragging).toBe(true);

      // Release mouse to clean up
      await page.mouse.up();
    });

    /**
     * Test: Duck remains in drag state while mouse is held down
     *
     * Validates: Requirements 17.2
     */
    test("duck remains in drag state while mouse is held down", async ({ page }) => {
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

      // Move mouse around while holding
      await page.mouse.move(screenPos.x + 50, screenPos.y, { steps: 5 });
      await page.waitForTimeout(50);
      await page.mouse.move(screenPos.x - 30, screenPos.y, { steps: 5 });
      await page.waitForTimeout(50);

      // Verify still in drag state
      const stillDragging = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(stillDragging.isBeingDragged).toBe(true);
      expect(stillDragging.isFalling).toBe(false);

      // Release mouse
      await page.mouse.up();
    });

    /**
     * Test: Duck Y position doesn't change during drag
     *
     * Validates: Requirements 17.2
     */
    test("duck Y position remains stable during drag", async ({ page }) => {
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

      // Get Y position during drag
      const yDuringDrag: number = await getGameState(page, "currentDuck.y");

      // Wait and move mouse
      await page.mouse.move(screenPos.x + 100, screenPos.y, { steps: 10 });
      await page.waitForTimeout(200);

      // Y should not have changed
      const yAfterMove: number = await getGameState(page, "currentDuck.y");
      expect(yAfterMove).toBe(yDuringDrag);

      // Release mouse
      await page.mouse.up();
    });

    /**
     * Test: Duck X position updates during drag
     *
     * Validates: Requirements 17.2
     */
    test("duck X position updates during drag", async ({ page }) => {
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

      // Move mouse to the right
      const newScreenPos = await designToScreen(page, duckX + 80, duckY);
      await page.mouse.move(newScreenPos.x, newScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // X should have changed
      const newDuckX: number = await getGameState(page, "currentDuck.x");
      expect(newDuckX).toBeGreaterThan(duckX);

      // Release mouse
      await page.mouse.up();
    });

    /**
     * Test: isStatic remains false during drag
     *
     * Validates: Requirements 17.2
     */
    test("isStatic remains false during drag", async ({ page }) => {
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

      // Verify isStatic is false
      const isStatic = await getGameState(page, "currentDuck.isStatic");
      expect(isStatic).toBe(false);

      // Release mouse
      await page.mouse.up();
    });
  });

  test.describe("Duck Falling State (Requirement 17.3, 17.5, 17.6)", () => {
    /**
     * Test: After drag ends, isBeingDragged=false and isFalling=true
     *
     * When drag ends, duck SHALL have isBeingDragged=false and isFalling=true.
     *
     * Validates: Requirements 17.3
     */
    test("after drag ends, isBeingDragged=false and isFalling=true", async ({ page }) => {
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

      // Verify in drag state
      const duringDrag = await getGameState(page, "currentDuck.isBeingDragged");
      expect(duringDrag).toBe(true);

      // Release mouse (end drag)
      await page.mouse.up();
      await page.waitForTimeout(50);

      // Verify falling state
      const afterRelease = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isBeingDragged: gs.currentDuck?.isBeingDragged,
          isFalling: gs.currentDuck?.isFalling,
        };
      });

      expect(afterRelease.isBeingDragged).toBe(false);
      expect(afterRelease.isFalling).toBe(true);
    });

    /**
     * Test: Space key triggers isFalling=true immediately
     *
     * When duck is dropped via Space, isFalling SHALL be true immediately.
     *
     * Validates: Requirements 17.5
     */
    test("Space key sets isFalling=true immediately", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is not falling initially
      const beforeSpace = await getGameState(page, "currentDuck.isFalling");
      expect(beforeSpace).toBe(false);

      // Press Space
      await page.keyboard.press("Space");

      // Verify isFalling is true immediately
      const afterSpace = await getGameState(page, "currentDuck.isFalling");
      expect(afterSpace).toBe(true);
    });

    /**
     * Test: Click away triggers isFalling=true
     *
     * When duck is dropped via click away, isFalling SHALL be true.
     *
     * Validates: Requirements 17.6
     */
    test("click away from duck sets isFalling=true", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify duck is not falling initially
      const beforeClick = await getGameState(page, "currentDuck.isFalling");
      expect(beforeClick).toBe(false);

      // Get duck position and click far away
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const gameWidth: number = await getGameState(page, "width");

      // Click far away from duck
      const farAwayX = duckX > gameWidth / 2 ? 50 : gameWidth - 50;
      const screenPos = await designToScreen(page, farAwayX, duckY + 100);
      await page.mouse.click(screenPos.x, screenPos.y);
      await page.waitForTimeout(50);

      // Verify isFalling is true
      const afterClick = await getGameState(page, "currentDuck.isFalling");
      expect(afterClick).toBe(true);
    });

    /**
     * Test: Duck Y position increases while falling
     *
     * Validates: Requirements 17.3, 17.5
     */
    test("duck Y position increases while falling", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial Y
      const initialY: number = await getGameState(page, "currentDuck.y");

      // Drop the duck
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);

      // Y should have increased (duck is falling down)
      const afterFallY: number = await getGameState(page, "currentDuck.y");
      expect(afterFallY).toBeGreaterThan(initialY);
    });

    /**
     * Test: isStatic remains false while falling
     *
     * Validates: Requirements 17.3
     */
    test("isStatic remains false while falling", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Drop the duck
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);

      // Verify falling and not static
      const state = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(state.isFalling).toBe(true);
      expect(state.isStatic).toBe(false);
    });
  });

  test.describe("Property 51: Duck Landed State", () => {
    /**
     * Test: After landing, duck has isStatic=true and isFalling=false
     *
     * For any duck that has landed, isStatic SHALL be true and isFalling SHALL be false.
     *
     * Validates: Requirements 17.4
     */
    test("after landing, duck has isStatic=true and isFalling=false", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Position duck over stack for successful landing
      await positionDuckOverStack(page, 0);

      // Get score before drop
      const scoreBefore: number = await getGameState(page, "score");

      // Drop and wait for result
      const result = await dropAndWaitForResult(page, scoreBefore);

      // If successful landing
      if (result.mode === "PLAYING" && result.score > scoreBefore) {
        // The landed duck should now be in the ducks array as static
        const landedDuckState = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          // Get the most recently landed duck (second to last in array, since last is base)
          // Actually, ducks are added to the end, so the most recent landed duck is at index length-1
          // But the base duck is at index 0, so landed ducks are at indices 1 to length-1
          const ducks = gs.ducks;
          if (ducks.length > 1) {
            const landedDuck = ducks[ducks.length - 1];
            return {
              isStatic: landedDuck.isStatic,
              isFalling: landedDuck.isFalling,
              isBeingDragged: landedDuck.isBeingDragged,
            };
          }
          return null;
        });

        if (landedDuckState) {
          expect(landedDuckState.isStatic).toBe(true);
          expect(landedDuckState.isFalling).toBe(false);
          expect(landedDuckState.isBeingDragged).toBe(false);
        }
      }
    });

    /**
     * Test: Base duck is always static
     *
     * Validates: Requirements 17.4
     */
    test("base duck is always static", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify base duck (index 0) is static
      const baseDuckState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const baseDuck = gs.ducks[0];
        return {
          isStatic: baseDuck.isStatic,
          isFalling: baseDuck.isFalling,
          isBeingDragged: baseDuck.isBeingDragged,
        };
      });

      expect(baseDuckState.isStatic).toBe(true);
      expect(baseDuckState.isFalling).toBe(false);
      expect(baseDuckState.isBeingDragged).toBe(false);
    });

    /**
     * Test: Landed duck Y position doesn't change
     *
     * Validates: Requirements 17.4
     */
    test("landed duck Y position remains stable", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get base duck Y position
      const baseDuckY = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].y;
      });

      // Wait a bit
      await page.waitForTimeout(200);

      // Y should not have changed
      const baseDuckYAfter = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[0].y;
      });

      expect(baseDuckYAfter).toBe(baseDuckY);
    });

    /**
     * Test: Multiple landed ducks are all static
     *
     * Validates: Requirements 17.4
     */
    test("multiple landed ducks are all static", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Land a few ducks
      let score = 0;
      for (let i = 0; i < 3; i++) {
        // Wait for hovering duck
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

        // Position and drop
        await positionDuckOverStack(page, 0);
        const result = await dropAndWaitForResult(page, score);

        if (result.mode === "GAMEOVER") {
          break;
        }

        score = result.score;
      }

      // Verify all ducks in the array are static
      const allDucksStatic = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks.every(
          (duck: { isStatic: boolean; isFalling: boolean }) =>
            duck.isStatic === true && duck.isFalling === false,
        );
      });

      expect(allDucksStatic).toBe(true);
    });
  });

  test.describe("Duck State Transitions - Combined Tests", () => {
    /**
     * Test: Complete state transition cycle: hover -> drag -> falling -> landed
     *
     * Validates: Requirements 17.1, 17.2, 17.3, 17.4
     */
    test("complete state transition: hover -> drag -> falling -> landed", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // 1. Verify initial hover state
      const hoverState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(hoverState.isFalling).toBe(false);
      expect(hoverState.isStatic).toBe(false);
      expect(hoverState.isBeingDragged).toBe(false);

      // 2. Transition to drag state
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      const dragState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(dragState.isFalling).toBe(false);
      expect(dragState.isStatic).toBe(false);
      expect(dragState.isBeingDragged).toBe(true);

      // Position over stack while dragging
      const topDuckX = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.ducks[gs.ducks.length - 1].x;
      });

      const targetScreenPos = await designToScreen(page, topDuckX, duckY);
      await page.mouse.move(targetScreenPos.x, targetScreenPos.y, { steps: 10 });
      await page.waitForTimeout(50);

      // 3. Transition to falling state (release drag)
      await page.mouse.up();
      await page.waitForTimeout(50);

      const fallingState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(fallingState.isFalling).toBe(true);
      expect(fallingState.isStatic).toBe(false);
      expect(fallingState.isBeingDragged).toBe(false);

      // 4. Wait for landing (duck becomes static in ducks array)
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          // Either game over or new duck spawned (meaning previous one landed)
          return (
            gs.mode === "GAMEOVER" ||
            (gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic)
          );
        },
        { timeout: 15000 },
      );

      const mode = await getGameState(page, "mode");
      if (mode === "PLAYING") {
        // Verify all ducks in array are static (landed)
        const allStatic = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks.every((d: { isStatic: boolean }) => d.isStatic === true);
        });
        expect(allStatic).toBe(true);
      }
    });

    /**
     * Test: Complete state transition cycle: hover -> Space drop -> falling -> landed
     *
     * Validates: Requirements 17.1, 17.4, 17.5
     */
    test("complete state transition: hover -> Space drop -> falling -> landed", async ({
      page,
    }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // 1. Verify initial hover state
      const hoverState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(hoverState.isFalling).toBe(false);
      expect(hoverState.isStatic).toBe(false);
      expect(hoverState.isBeingDragged).toBe(false);

      // Position over stack using arrow keys
      await positionDuckOverStack(page, 0);

      // 2. Transition to falling state via Space
      await page.keyboard.press("Space");

      const fallingState = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
          isBeingDragged: gs.currentDuck?.isBeingDragged,
        };
      });

      expect(fallingState.isFalling).toBe(true);
      expect(fallingState.isStatic).toBe(false);
      expect(fallingState.isBeingDragged).toBe(false);

      // 3. Wait for landing
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
      if (mode === "PLAYING") {
        // Verify all ducks in array are static
        const allStatic = await page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.ducks.every((d: { isStatic: boolean }) => d.isStatic === true);
        });
        expect(allStatic).toBe(true);
      }
    });

    /**
     * Test: State consistency - no invalid state combinations
     *
     * Validates: Requirements 17.1, 17.2, 17.3, 17.4
     */
    test("no invalid state combinations exist", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Helper to check state validity
      const checkStateValidity = async () => {
        return page.evaluate(() => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          const duck = gs.currentDuck;

          if (!duck) return { valid: true, reason: "no current duck" };

          // Invalid: isStatic=true AND isFalling=true
          if (duck.isStatic && duck.isFalling) {
            return { valid: false, reason: "isStatic and isFalling both true" };
          }

          // Invalid: isBeingDragged=true AND isFalling=true
          if (duck.isBeingDragged && duck.isFalling) {
            return { valid: false, reason: "isBeingDragged and isFalling both true" };
          }

          // Invalid: isStatic=true AND isBeingDragged=true
          if (duck.isStatic && duck.isBeingDragged) {
            return { valid: false, reason: "isStatic and isBeingDragged both true" };
          }

          return { valid: true, reason: "state is valid" };
        });
      };

      // Check initial state
      let stateCheck = await checkStateValidity();
      expect(stateCheck.valid).toBe(true);

      // Check during drag
      const duckX: number = await getGameState(page, "currentDuck.x");
      const duckY: number = await getGameState(page, "currentDuck.y");
      const screenPos = await designToScreen(page, duckX, duckY);

      await page.mouse.move(screenPos.x, screenPos.y);
      await page.mouse.down();
      await page.waitForTimeout(50);

      stateCheck = await checkStateValidity();
      expect(stateCheck.valid).toBe(true);

      // Check after release (falling)
      await page.mouse.up();
      await page.waitForTimeout(50);

      stateCheck = await checkStateValidity();
      expect(stateCheck.valid).toBe(true);
    });

    /**
     * Test: prevY is updated correctly during falling
     *
     * Validates: Requirements 17.3
     */
    test("prevY is updated correctly during falling", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Drop the duck
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);

      // Get initial prevY and y
      const state1 = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          prevY: gs.currentDuck?.prevY,
          y: gs.currentDuck?.y,
        };
      });

      // Wait for a few frames
      await page.waitForTimeout(100);

      // Get updated prevY and y
      const state2 = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          prevY: gs.currentDuck?.prevY,
          y: gs.currentDuck?.y,
        };
      });

      // prevY should be less than y (duck is falling down)
      // and prevY should have been updated from the previous frame
      if (state2.prevY !== undefined && state2.y !== undefined) {
        expect(state2.prevY).toBeLessThanOrEqual(state2.y);
        expect(state2.y).toBeGreaterThan(state1.y);
      }
    });
  });
});
