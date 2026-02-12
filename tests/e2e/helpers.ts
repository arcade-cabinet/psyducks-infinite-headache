import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Wait for the game script module to fully load and attach event handlers.
 * The game script sets data-game-ready="true" on <body> after all handlers are attached.
 */
export async function waitForGameReady(page: Page) {
  await page.waitForFunction(() => document.body.dataset.gameReady === "true", { timeout: 15000 });
}

/**
 * Click start button and wait for game to begin
 */
export async function startGame(page: Page) {
  await waitForGameReady(page);
  await page.locator("#startBtn").click();
  await expect(page.locator("#start-screen")).toBeHidden({ timeout: 5000 });
  await expect(page.locator("#scoreBox")).toBeVisible();
}

/**
 * Verify the canvas is actually rendering (not all-black).
 * Samples pixels across the canvas and checks that at least some have non-zero RGB values.
 */
export async function expectCanvasRendering(page: Page) {
  const isRendering = await page.evaluate(() => {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement | null;
    if (!canvas) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    // Sample 5 points across the canvas
    const w = canvas.width;
    const h = canvas.height;
    const points = [
      [w * 0.5, h * 0.3],
      [w * 0.25, h * 0.5],
      [w * 0.75, h * 0.5],
      [w * 0.5, h * 0.7],
      [w * 0.5, h * 0.9],
    ];

    let nonBlackPixels = 0;
    for (const [x, y] of points) {
      const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      if (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0) {
        nonBlackPixels++;
      }
    }

    // At least 2 of 5 sampled points should be non-black
    return nonBlackPixels >= 2;
  });

  expect(isRendering).toBe(true);
}

/**
 * Read __gameState property from the browser via dot-separated path.
 * Centralizes the `window as any` cast to a single location.
 */
// biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
export function getGameState(page: Page, path: string): Promise<any> {
  return page.evaluate((p) => {
    // biome-ignore lint/suspicious/noExplicitAny: injected game state
    const gs = (window as any).__gameState;
    return p.split(".").reduce((obj: unknown, key: string) => {
      if (obj != null && typeof obj === "object") return (obj as Record<string, unknown>)[key];
      return undefined;
    }, gs);
  }, path);
}

// ---------------------------------------------------------------------------
// Collision Helper Functions
// ---------------------------------------------------------------------------

/**
 * Position the current (hovering) duck so that its X aligns with the
 * top-of-stack duck, then optionally apply a pixel offset.
 *
 * Uses ArrowLeft/Right in 15 px design-space increments to move the duck.
 * Returns the final duck X after positioning.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * @param page - Playwright page instance
 * @param offsetFromCenter - Pixel offset from the top duck's center (positive = right, negative = left)
 * @returns The final X position of the current duck
 */
export async function positionDuckOverStack(page: Page, offsetFromCenter = 0): Promise<number> {
  // Read the X of the top stacked duck (landing target)
  // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
  const ducks: { x: number }[] = await page.evaluate(() => (window as any).__gameState.ducks);
  const topDuck = ducks[ducks.length - 1];
  const targetX = topDuck.x + offsetFromCenter;

  // Read current duck position
  let currentX: number = await getGameState(page, "currentDuck.x");

  const arrowStep = 15; // matches ARROW_MOVE_PX in game.ts
  const maxIterations = 80; // safety cap
  let iterations = 0;

  while (Math.abs(currentX - targetX) > arrowStep / 2 && iterations < maxIterations) {
    if (currentX < targetX) {
      await page.keyboard.press("ArrowRight");
    } else {
      await page.keyboard.press("ArrowLeft");
    }
    await page.waitForTimeout(30);
    currentX = await getGameState(page, "currentDuck.x");
    iterations++;
  }

  return currentX;
}

/**
 * Drop the duck (Space) and wait for either a score change or game-over.
 * Returns an object with the new game mode and score after the event resolves.
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * @param page - Playwright page instance
 * @param previousScore - The score before dropping (used to detect successful landing)
 * @param timeout - Maximum time to wait for result in milliseconds (default: 15000)
 * @returns Object containing the game mode ('PLAYING' | 'GAMEOVER' | 'LEVELUP') and current score
 */
export async function dropAndWaitForResult(
  page: Page,
  previousScore: number,
  timeout = 15000,
): Promise<{ mode: string; score: number }> {
  await page.keyboard.press("Space");

  await page.waitForFunction(
    (prevScore) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return gs.score > prevScore || gs.mode === "GAMEOVER" || gs.mode === "LEVELUP";
    },
    previousScore,
    { timeout },
  );

  const mode = (await getGameState(page, "mode")) as string;
  const score = (await getGameState(page, "score")) as number;

  return { mode, score };
}

/**
 * Calculate the target Y position for collision detection.
 * This is the Y coordinate that a falling duck must cross to trigger a landing check.
 *
 * The target Y is calculated as: topDuck.y - topDuck.h * 0.85
 * This represents the point where the falling duck's bottom would overlap with
 * the top duck's head area.
 *
 * **Validates: Requirements 1.1, 1.3**
 *
 * @param page - Playwright page instance
 * @returns The target Y coordinate for collision detection
 */
export async function calculateTargetY(page: Page): Promise<number> {
  const topDuck = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const top = gs.ducks[gs.ducks.length - 1];
    return { y: top.y, h: top.h };
  });

  // Target Y is where the falling duck's bottom would meet the top duck's head
  // This matches the collision detection logic in the game
  return topDuck.y - topDuck.h * 0.85;
}

/**
 * Start game with a deterministic seed for reproducible test scenarios.
 * Fills the seed input before clicking Play so every run is reproducible.
 *
 * @param page - Playwright page instance
 * @param seed - The seed string to use for deterministic randomness
 */
export async function startSeededGame(page: Page, seed: string): Promise<void> {
  await page.goto("");
  await page.fill("#seedInput", seed);
  await startGame(page);
}

/**
 * Result of waiting for a new duck to spawn.
 */
export interface NewDuckResult {
  /** Whether a new duck spawned successfully */
  success: boolean;
  /** The game mode when the wait completed */
  mode: string;
  /** Reason for failure if success is false */
  reason?: "gameover" | "levelup" | "timeout";
}

/**
 * Wait for a new hovering duck to spawn after a successful landing.
 * Returns a result object with success status and game mode.
 *
 * This function handles all possible outcomes:
 * - success: A new hovering duck spawned
 * - gameover: Game ended before a new duck could spawn
 * - levelup: Level up triggered before a new duck could spawn
 * - timeout: Maximum wait time exceeded
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait in milliseconds (default: 15000)
 * @returns NewDuckResult with success status and game mode
 */
export async function waitForNewDuckResult(page: Page, timeout = 15000): Promise<NewDuckResult> {
  const startTime = Date.now();
  const pollInterval = 100;

  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      if (!gs) {
        return { hasHoveringDuck: false, mode: "UNKNOWN" };
      }

      const currentDuck = gs.currentDuck;
      const hasHoveringDuck = currentDuck && !currentDuck.isFalling && !currentDuck.isStatic;

      return { hasHoveringDuck, mode: gs.mode };
    });

    // Success: new hovering duck spawned
    if (state.hasHoveringDuck && state.mode === "PLAYING") {
      return { success: true, mode: state.mode };
    }

    // Game over: no new duck will spawn
    if (state.mode === "GAMEOVER") {
      return { success: false, mode: state.mode, reason: "gameover" };
    }

    // Level up: game is in transition
    if (state.mode === "LEVELUP") {
      return { success: false, mode: state.mode, reason: "levelup" };
    }

    await page.waitForTimeout(pollInterval);
  }

  // Timeout reached
  const finalMode = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    return gs?.mode ?? "UNKNOWN";
  });

  return { success: false, mode: finalMode, reason: "timeout" };
}

/**
 * Wait for a new hovering duck to spawn after a successful landing.
 * The duck will be in hover state (isFalling=false, isStatic=false).
 *
 * This is a convenience wrapper around waitForNewDuckResult that handles
 * game over and level up gracefully by returning early (no throw).
 * Only throws on timeout.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait in milliseconds (default: 15000)
 * @throws Error if timeout is reached without a new duck spawning
 */
export async function waitForNewDuck(page: Page, timeout = 15000): Promise<void> {
  const result = await waitForNewDuckResult(page, timeout);

  if (result.success) {
    return;
  }

  // Game over and level up are valid game states - don't throw, just return
  // The calling test should check game mode if it matters
  if (result.reason === "gameover" || result.reason === "levelup") {
    return;
  }

  // Timeout is an error - throw
  throw new Error(`waitForNewDuck timed out after ${timeout}ms. Game mode: ${result.mode}`);
}

// ---------------------------------------------------------------------------
// Boundary Helper Functions
// ---------------------------------------------------------------------------

/**
 * Move the current duck to the specified edge of the game area using arrow keys.
 * Repeatedly presses ArrowLeft or ArrowRight until the duck reaches the boundary.
 *
 * The duck's x-position should be clamped to [halfWidth, width - halfWidth] where
 * halfWidth = duck.w / 2.
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * @param page - Playwright page instance
 * @param direction - 'left' to move to left edge, 'right' to move to right edge
 * @returns The final X position of the duck after reaching the edge
 */
export async function moveDuckToEdge(page: Page, direction: "left" | "right"): Promise<number> {
  const key = direction === "left" ? "ArrowLeft" : "ArrowRight";
  const arrowStep = 15; // ARROW_MOVE_PX from game.ts

  // Get initial position
  let currentX: number = await getGameState(page, "currentDuck.x");
  let prevX = currentX;

  // Keep pressing until position stops changing (hit boundary)
  const maxIterations = 100; // Safety cap to prevent infinite loops
  let iterations = 0;

  while (iterations < maxIterations) {
    await page.keyboard.press(key);
    await page.waitForTimeout(30);

    currentX = await getGameState(page, "currentDuck.x");

    // If position didn't change by at least half a step, we've hit the boundary
    if (Math.abs(currentX - prevX) < arrowStep / 2) {
      break;
    }

    prevX = currentX;
    iterations++;
  }

  return currentX;
}

/**
 * Verify that the current duck's x-position is within valid bounds.
 * Returns the duck's current position along with the calculated min and max bounds.
 *
 * The valid range is [halfWidth, width - halfWidth] where halfWidth = duck.w / 2.
 * This ensures the duck's visual representation stays fully within the game area.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 *
 * @param page - Playwright page instance
 * @returns Object containing current x position and the valid min/max bounds
 */
export async function verifyDuckBounds(
  page: Page,
): Promise<{ x: number; minX: number; maxX: number }> {
  const bounds = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const duck = gs.currentDuck;
    const gameWidth = gs.width;
    const halfWidth = duck.w / 2;

    return {
      x: duck.x,
      minX: halfWidth,
      maxX: gameWidth - halfWidth,
    };
  });

  return bounds;
}

// ---------------------------------------------------------------------------
// State Helper Functions
// ---------------------------------------------------------------------------

/**
 * Game mode type for state transitions.
 */
export type GameMode = "MENU" | "PLAYING" | "GAMEOVER" | "LEVELUP";

/**
 * Wait for the game to transition to a specific mode.
 * Polls the game state until the mode matches or timeout is reached.
 *
 * **Validates: Requirements 4.1, 4.2, 4.4**
 *
 * @param page - Playwright page instance
 * @param mode - The target game mode to wait for
 * @param timeout - Maximum time to wait in milliseconds (default: 15000)
 */
export async function waitForGameMode(page: Page, mode: GameMode, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    (targetMode) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return gs && gs.mode === targetMode;
    },
    mode,
    { timeout },
  );
}

/**
 * Trigger a game over by positioning the duck far outside the hit tolerance
 * and dropping it. This causes the duck to miss the stack entirely.
 *
 * The function moves the duck to the far edge of the screen (opposite from
 * the stack) and drops it, ensuring it misses the collision zone.
 *
 * **Validates: Requirements 4.2**
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait for game over in milliseconds (default: 15000)
 */
export async function triggerGameOver(page: Page, timeout = 15000): Promise<void> {
  // Get the top duck's position to determine which direction to move away from
  const topDuckX = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const topDuck = gs.ducks[gs.ducks.length - 1];
    return topDuck.x;
  });

  const gameWidth: number = await getGameState(page, "width");

  // Move duck to the opposite side of the screen from the stack
  // If stack is on left half, move to right edge; otherwise move to left edge
  const direction = topDuckX < gameWidth / 2 ? "right" : "left";
  await moveDuckToEdge(page, direction);

  // Drop the duck - it should miss the stack and trigger game over
  await page.keyboard.press("Space");

  // Wait for game over mode
  await waitForGameMode(page, "GAMEOVER", timeout);
}

/**
 * Trigger a merge by manipulating the game state to set mergeCount to 4,
 * then landing a duck to reach the merge threshold of 5.
 *
 * This function:
 * 1. Sets mergeCount to 4 via state manipulation
 * 2. Positions the duck over the stack
 * 3. Drops the duck to trigger the merge
 *
 * **Validates: Requirements 5.1**
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait for merge completion in milliseconds (default: 15000)
 */
export async function triggerMerge(page: Page, timeout = 15000): Promise<void> {
  // Set mergeCount to 4 so the next successful landing triggers a merge
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    gs.mergeCount = 4;
  });

  // Position duck over the stack center for a successful landing
  await positionDuckOverStack(page, 0);

  // Get current merge level before drop
  const prevMergeLevel = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    return gs.ducks[0].mergeLevel;
  });

  // Drop the duck
  await page.keyboard.press("Space");

  // Wait for merge to complete (mergeLevel should increment)
  await page.waitForFunction(
    (prevLevel) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      // Merge is complete when base duck's mergeLevel has increased
      return gs.ducks[0].mergeLevel > prevLevel;
    },
    prevMergeLevel,
    { timeout },
  );
}

/**
 * Trigger a level up by manipulating the base duck's width to just below
 * the level up threshold (80% of screen width), then triggering a merge
 * to push it over the threshold.
 *
 * This function:
 * 1. Sets the base duck width to just below 80% of screen width
 * 2. Sets mergeCount to 4 so next landing triggers merge
 * 3. Lands a duck to trigger merge and level up
 *
 * **Validates: Requirements 4.4**
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum time to wait for level up in milliseconds (default: 15000)
 */
export async function triggerLevelUp(page: Page, timeout = 15000): Promise<void> {
  // Set base duck width to just below level up threshold and mergeCount to 4
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const levelUpWidth = gs.width * 0.8;
    // Set base duck width to 95% of level up threshold
    gs.ducks[0].w = levelUpWidth * 0.95;
    // Set mergeCount so next landing triggers merge (which will push over threshold)
    gs.mergeCount = 4;
  });

  // Position duck over the stack center for a successful landing
  await positionDuckOverStack(page, 0);

  // Drop the duck
  await page.keyboard.press("Space");

  // Wait for level up mode
  await waitForGameMode(page, "LEVELUP", timeout);
}

// ---------------------------------------------------------------------------
// Coordinate Conversion Helper Functions
// ---------------------------------------------------------------------------

/**
 * Convert design-space coordinates to screen (CSS pixel) coordinates.
 *
 * The game uses a design space with width clamped to [412, 800] pixels that
 * scales to fill the viewport. This function converts coordinates from the
 * game's internal design space to screen coordinates that Playwright can use
 * for mouse/touch events.
 *
 * The conversion formula is:
 * - screenX = designX * scale + gameOffsetX + canvasRect.left
 * - screenY = designY * scale + canvasRect.top
 *
 * Where scale = viewportWidth / designWidth and gameOffsetX is always 0.
 *
 * **Validates: Requirements 3.4, 3.7**
 *
 * @param page - Playwright page instance
 * @param designX - X coordinate in design space
 * @param designY - Y coordinate in design space
 * @returns Screen coordinates {x, y} in CSS pixels
 */
export async function designToScreen(
  page: Page,
  designX: number,
  designY: number,
): Promise<{ x: number; y: number }> {
  const screenCoords = await page.evaluate(
    ({ dx, dy }) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();

      // Convert design coordinates to screen coordinates
      // screenX = designX * scale + gameOffsetX + rect.left
      // screenY = designY * scale + rect.top
      return {
        x: dx * gs.scale + gs.gameOffsetX + rect.left,
        y: dy * gs.scale + rect.top,
      };
    },
    { dx: designX, dy: designY },
  );

  return screenCoords;
}

/**
 * Convert screen (CSS pixel) coordinates to design-space coordinates.
 *
 * The game uses a design space with width clamped to [412, 800] pixels that
 * scales to fill the viewport. This function converts screen coordinates
 * (from mouse/touch events) to the game's internal design space coordinates.
 *
 * The conversion formula is:
 * - designX = (screenX - canvasRect.left - gameOffsetX) / scale
 * - designY = (screenY - canvasRect.top) / scale
 *
 * Where scale = viewportWidth / designWidth and gameOffsetX is always 0.
 *
 * **Validates: Requirements 3.4, 3.7**
 *
 * @param page - Playwright page instance
 * @param screenX - X coordinate in screen (CSS pixel) space
 * @param screenY - Y coordinate in screen (CSS pixel) space
 * @returns Design-space coordinates {x, y}
 */
export async function screenToDesign(
  page: Page,
  screenX: number,
  screenY: number,
): Promise<{ x: number; y: number }> {
  const designCoords = await page.evaluate(
    ({ sx, sy }) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();

      // Convert screen coordinates to design coordinates
      // designX = (screenX - rect.left - gameOffsetX) / scale
      // designY = (screenY - rect.top) / scale
      return {
        x: (sx - rect.left - gs.gameOffsetX) / gs.scale,
        y: (sy - rect.top) / gs.scale,
      };
    },
    { sx: screenX, sy: screenY },
  );

  return designCoords;
}

// ---------------------------------------------------------------------------
// Wobble State Helper Functions
// ---------------------------------------------------------------------------

/**
 * Wobble state interface matching the game's WobblePhysics state.
 */
export interface WobbleState {
  angle: number;
  angularVelocity: number;
  instability: number;
  stability: number;
  centerOfMassOffset: number;
}

/**
 * Get the current wobble physics state from the game.
 * Returns angle, angularVelocity, instability, and stability from game state.
 *
 * **Validates: Requirements US-2.1**
 *
 * @param page - Playwright page instance
 * @returns The current wobble physics state
 */
export async function getWobbleState(page: Page): Promise<WobbleState> {
  return page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (!gs.wobblePhysics) {
      return {
        angle: 0,
        angularVelocity: 0,
        instability: 0,
        stability: 1,
        centerOfMassOffset: 0,
      };
    }
    const state = gs.wobblePhysics.getState();
    return {
      angle: gs.wobblePhysics.angle,
      angularVelocity: gs.wobblePhysics.angularVelocity,
      instability: gs.wobblePhysics.instability,
      stability: state.stability,
      centerOfMassOffset: gs.wobblePhysics.centerOfMassOffset,
    };
  });
}

/**
 * Set wobble physics instability directly for testing edge cases.
 * This manipulates the actual game state and temporarily disables the
 * instability calculation in the update method.
 * Waits for render loop to update UI after setting the value.
 *
 * **Validates: Requirements US-2.3**
 *
 * @param page - Playwright page instance
 * @param instability - The instability value to set (0-1, where 0 is stable, 1 is unstable)
 */
export async function setWobbleInstability(page: Page, instability: number): Promise<void> {
  await page.evaluate((inst) => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (gs.wobblePhysics) {
      // Store original update method if not already stored
      if (!gs.wobblePhysics._originalUpdate) {
        gs.wobblePhysics._originalUpdate = gs.wobblePhysics.update.bind(gs.wobblePhysics);
        // Override update to preserve our test instability value
        gs.wobblePhysics.update = function (
          stackHeight: number,
          imbalance: number,
          mergeLevel: number,
          rng: { next: () => number },
        ) {
          // Skip the instability calculation, just do the physics
          // Add random perturbations (wind, headache shakes) using seeded RNG
          const randomForce = (rng.next() - 0.5) * this.instability * 0.01;

          // Restoring force (tries to bring tower back to upright)
          const restoringForce = -this.angle * this.restoring * (1 - this.instability);

          // Center of mass offset creates additional force
          const massForce = this.centerOfMassOffset * 0.001 * this.instability;

          // Update angular acceleration
          const angularAcceleration = restoringForce + randomForce + massForce;

          // Update velocity and position
          this.angularVelocity += angularAcceleration;
          this.angularVelocity *= this.damping; // Apply damping
          this.angle += this.angularVelocity;

          // Clamp angle
          this.angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.angle));

          // Check for collapse
          return Math.abs(this.angle) < this.maxAngle * 0.95;
        };
      }
      // Set the instability value
      gs.wobblePhysics.instability = inst;
    }
  }, instability);
  // Wait for render loop to update stability bar
  await page.waitForTimeout(100);
}

/**
 * Restore the original wobble physics update method after testing.
 * Call this after tests that use setWobbleInstability to clean up.
 *
 * @param page - Playwright page instance
 */
export async function restoreWobbleUpdate(page: Page): Promise<void> {
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (gs.wobblePhysics?._originalUpdate) {
      gs.wobblePhysics.update = gs.wobblePhysics._originalUpdate;
      delete gs.wobblePhysics._originalUpdate;
    }
  });
}

// ---------------------------------------------------------------------------
// Duck Landing Result Helper Functions
// ---------------------------------------------------------------------------

/**
 * Result of waiting for a duck to land.
 * Provides comprehensive outcome handling for all possible landing scenarios.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
 */
export interface LandingResult {
  /** The outcome of the landing attempt */
  outcome: "landed" | "gameover" | "timeout" | "stuck";
  /** The current score after the landing attempt */
  score: number;
  /** The current game mode after the landing attempt */
  mode: string;
  /** Duck state diagnostics (available for timeout and stuck outcomes) */
  duckState?: {
    isFalling: boolean;
    isStatic: boolean;
    y: number;
  };
}

/**
 * Wait for duck landing with comprehensive outcome handling.
 * Never hangs - always returns a result or times out gracefully.
 *
 * This function handles all possible outcomes:
 * - 'landed': Score increased, duck successfully landed on stack
 * - 'gameover': Game ended (duck missed the stack)
 * - 'timeout': Maximum wait time exceeded (duck still falling or stuck)
 * - 'stuck': Duck is static but score didn't increase (edge case)
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.5**
 *
 * @param page - Playwright page instance
 * @param previousScore - The score before dropping (used to detect successful landing)
 * @param timeout - Maximum time to wait for result in milliseconds (default: 15000)
 * @returns LandingResult object with outcome, score, mode, and optional duck state diagnostics
 */
export async function waitForDuckLandingResult(
  page: Page,
  previousScore: number,
  timeout = 15000,
): Promise<LandingResult> {
  const startTime = Date.now();
  const pollInterval = 100; // Check every 100ms

  while (Date.now() - startTime < timeout) {
    // Get current game state
    const state = await page.evaluate((prevScore) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      if (!gs) {
        return { outcome: null, score: 0, mode: "UNKNOWN", duckState: null };
      }

      const currentDuck = gs.currentDuck;
      const getDuckState = () =>
        currentDuck
          ? { isFalling: currentDuck.isFalling, isStatic: currentDuck.isStatic, y: currentDuck.y }
          : null;

      // Success: score increased
      if (gs.score > prevScore) {
        return { outcome: "landed", score: gs.score, mode: gs.mode, duckState: getDuckState() };
      }

      // Failure: game over
      if (gs.mode === "GAMEOVER") {
        return { outcome: "gameover", score: gs.score, mode: gs.mode, duckState: getDuckState() };
      }

      // Edge case: duck is static but score didn't increase (shouldn't happen normally)
      if (currentDuck?.isStatic && !currentDuck.isFalling) {
        return { outcome: "stuck", score: gs.score, mode: gs.mode, duckState: getDuckState() };
      }

      // Still waiting: duck is falling or in transition
      return { outcome: null, score: gs.score, mode: gs.mode, duckState: getDuckState() };
    }, previousScore);

    // If we got a definitive outcome, return it
    if (state.outcome !== null) {
      return {
        outcome: state.outcome as "landed" | "gameover" | "stuck",
        score: state.score,
        mode: state.mode,
        duckState: state.duckState ?? undefined,
      };
    }

    // Wait before next poll
    await page.waitForTimeout(pollInterval);
  }

  // Timeout reached - get final state for diagnostics
  const finalState = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (!gs) {
      return { score: 0, mode: "UNKNOWN", duckState: null };
    }

    const currentDuck = gs.currentDuck;
    return {
      score: gs.score,
      mode: gs.mode,
      duckState: currentDuck
        ? {
            isFalling: currentDuck.isFalling,
            isStatic: currentDuck.isStatic,
            y: currentDuck.y,
          }
        : null,
    };
  });

  return {
    outcome: "timeout",
    score: finalState.score,
    mode: finalState.mode,
    duckState: finalState.duckState ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Particle Helper Functions
// ---------------------------------------------------------------------------

/**
 * Get the current particle count from the game state.
 *
 * **Validates: Requirements 2.1, 2.2, 7.1, 7.3**
 *
 * @param page - Playwright page instance
 * @returns The number of particles currently in the game
 */
export async function getParticleCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    return gs?.particles?.length ?? 0;
  });
}

/**
 * Clear all particles from the game state.
 * Use this before tests to ensure accurate particle spawn detection.
 *
 * **Validates: Requirements 2.1, 2.2, 2.4**
 *
 * @param page - Playwright page instance
 */
export async function clearParticles(page: Page): Promise<void> {
  await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (gs?.particles) {
      gs.particles = [];
    }
  });
}

/**
 * Get the positions of all particles in the game.
 *
 * **Validates: Requirements 7.3, 7.4**
 *
 * @param page - Playwright page instance
 * @returns Array of particle positions {x, y}
 */
export async function getParticlePositions(page: Page): Promise<Array<{ x: number; y: number }>> {
  return page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    if (!gs?.particles) return [];
    return gs.particles.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
  });
}

/**
 * Wait for particles to spawn with retry logic.
 * Checks immediately after landing, then retries with extended wait if needed.
 *
 * **Validates: Requirements 2.1, 2.2, 2.4**
 *
 * @param page - Playwright page instance
 * @param initialWait - Initial wait time in ms before first check (default: 100)
 * @param maxWait - Maximum total wait time in ms (default: 500)
 * @returns The particle count after waiting
 */
export async function waitForParticles(
  page: Page,
  initialWait = 100,
  maxWait = 500,
): Promise<number> {
  // Initial check after short wait
  await page.waitForTimeout(initialWait);
  let count = await getParticleCount(page);

  if (count > 0) {
    return count;
  }

  // Retry with extended wait if initial detection fails
  const remainingWait = maxWait - initialWait;
  if (remainingWait > 0) {
    const pollInterval = 50;
    const startTime = Date.now();

    while (Date.now() - startTime < remainingWait) {
      await page.waitForTimeout(pollInterval);
      count = await getParticleCount(page);
      if (count > 0) {
        return count;
      }
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Precise Duck Positioning Helper Functions
// ---------------------------------------------------------------------------

/**
 * Position the current duck precisely for perfect landing tests.
 * First attempts to position using arrow keys, then uses direct state manipulation
 * if arrow keys cannot achieve the required tolerance.
 *
 * This ensures tests are deterministic and don't rely on arrow key movement precision.
 * Arrow keys move in 15px increments, so they can only achieve ~7.5px precision at best.
 * For perfect landing tests requiring 8px tolerance, direct state manipulation may be needed.
 *
 * **Validates: Requirements 2.3**
 *
 * @param page - Playwright page instance
 * @param tolerance - Maximum allowed offset from top duck's x position (default: 8, the perfectTolerance)
 * @param offsetFromCenter - Optional offset from center (default: 0 for perfect alignment)
 * @returns Object with final position info and whether direct manipulation was used
 */
export async function positionDuckPrecisely(
  page: Page,
  tolerance = 8,
  offsetFromCenter = 0,
): Promise<{ finalX: number; topDuckX: number; offset: number; usedDirectManipulation: boolean }> {
  // Get the top duck's x position (landing target)
  const topDuckX: number = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    return gs.ducks[gs.ducks.length - 1].x;
  });

  const targetX = topDuckX + offsetFromCenter;

  // First, try to position using arrow keys
  await positionDuckOverStack(page, offsetFromCenter);

  // Check if we achieved the required tolerance
  let currentX: number = await getGameState(page, "currentDuck.x");
  let currentOffset = Math.abs(currentX - topDuckX);
  let usedDirectManipulation = false;

  // If arrow keys couldn't achieve tolerance, use direct state manipulation
  if (currentOffset >= tolerance) {
    await page.evaluate(
      ({ tx }) => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (gs.currentDuck) {
          gs.currentDuck.x = tx;
        }
      },
      { tx: targetX },
    );
    usedDirectManipulation = true;

    // Re-read the position after manipulation
    currentX = await getGameState(page, "currentDuck.x");
    currentOffset = Math.abs(currentX - topDuckX);
  }

  return {
    finalX: currentX,
    topDuckX,
    offset: currentOffset,
    usedDirectManipulation,
  };
}

/**
 * Verify that the current duck is within the specified tolerance of the top duck.
 * Throws an error if the duck is not within tolerance.
 *
 * **Validates: Requirements 2.3**
 *
 * @param page - Playwright page instance
 * @param tolerance - Maximum allowed offset from top duck's x position (default: 8)
 * @throws Error if duck is not within tolerance
 */
export async function verifyDuckWithinTolerance(page: Page, tolerance = 8): Promise<void> {
  const state = await page.evaluate(() => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const topDuck = gs.ducks[gs.ducks.length - 1];
    const currentDuck = gs.currentDuck;
    return {
      topDuckX: topDuck.x,
      currentDuckX: currentDuck?.x ?? 0,
    };
  });

  const offset = Math.abs(state.currentDuckX - state.topDuckX);
  if (offset >= tolerance) {
    throw new Error(
      `Duck not within tolerance: offset=${offset}px, tolerance=${tolerance}px, ` +
        `currentX=${state.currentDuckX}, topDuckX=${state.topDuckX}`,
    );
  }
}
