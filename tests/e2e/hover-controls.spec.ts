import type { Page, TestInfo } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getGameState, waitForGameReady } from "./helpers";

/**
 * Seed used for all tests in this file to ensure reproducible duck spawn positions.
 */
const TEST_SEED = "hover-controls-test";

/**
 * Convert design-space coordinates to screen (CSS pixel) coordinates
 * so that Playwright mouse events land at the correct position on the canvas.
 */
async function designToScreen(
  page: Page,
  designX: number,
  designY: number,
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ dx, dy }) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return {
        x: dx * gs.scale + gs.gameOffsetX,
        y: (dy - gs.cameraY) * gs.scale,
      };
    },
    { dx: designX, dy: designY },
  );
}

/**
 * Enter the test seed into the seed input, then click PLAY and wait for
 * the game to enter PLAYING mode with a hovering duck.
 */
async function startSeededGame(page: Page): Promise<void> {
  await waitForGameReady(page);
  await page.fill("#seedInput", TEST_SEED);
  await page.locator("#startBtn").click();
  await expect(page.locator("#start-screen")).toBeHidden({ timeout: 5000 });
  await expect(page.locator("#scoreBox")).toBeVisible();

  // Wait until a currentDuck is present and in hover state
  await page.waitForFunction(
    () => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return gs.mode === "PLAYING" && gs.currentDuck && !gs.currentDuck.isFalling;
    },
    { timeout: 10000 },
  );
}

test.describe("Hover Phase & Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
  });

  // ---------- 1. Duck spawns in hover state ----------

  test("duck spawns in hover state", async ({ page }) => {
    await startSeededGame(page);

    const isFalling = await getGameState(page, "currentDuck.isFalling");
    const isStatic = await getGameState(page, "currentDuck.isStatic");

    expect(isFalling).toBe(false);
    expect(isStatic).toBe(false);
  });

  // ---------- 2. Hover duck stays in position ----------

  test("hover duck stays in position while waiting", async ({ page }) => {
    await startSeededGame(page);

    const initialY = await getGameState(page, "currentDuck.y");
    expect(typeof initialY).toBe("number");

    await page.waitForTimeout(500);

    const afterY = await getGameState(page, "currentDuck.y");
    expect(afterY).toBe(initialY);
  });

  // ---------- 3. ArrowRight moves duck right ----------

  test("ArrowRight moves duck right", async ({ page }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");

    await startSeededGame(page);
    await page.waitForTimeout(100);

    const initialX = await getGameState(page, "currentDuck.x");
    expect(typeof initialX).toBe("number");

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(50);
    }

    const afterX = await getGameState(page, "currentDuck.x");
    // 5 presses * 15px = 75px expected increase (may be clamped)
    expect(afterX).toBeGreaterThan(initialX);
    expect(afterX).toBeCloseTo(initialX + 75, -1);
  });

  // ---------- 4. ArrowLeft moves duck left ----------

  test("ArrowLeft moves duck left", async ({ page }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");

    await startSeededGame(page);
    await page.waitForTimeout(100);

    const initialX = await getGameState(page, "currentDuck.x");
    expect(typeof initialX).toBe("number");

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(50);
    }

    const afterX = await getGameState(page, "currentDuck.x");
    expect(afterX).toBeLessThan(initialX);
    expect(afterX).toBeCloseTo(initialX - 75, -1);
  });

  // ---------- 5. Arrow keys clamp to bounds ----------

  test("arrow keys clamp duck to game bounds", async ({ page }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");

    await startSeededGame(page);
    await page.waitForTimeout(100);

    const gameWidth = await getGameState(page, "width");
    const duckW = await getGameState(page, "currentDuck.w");
    const halfW = duckW / 2;

    // Push duck hard right
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.waitForTimeout(50);

    const rightX = await getGameState(page, "currentDuck.x");
    expect(rightX).toBeLessThanOrEqual(gameWidth - halfW);

    // Push duck hard left
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press("ArrowLeft");
    }
    await page.waitForTimeout(50);

    const leftX = await getGameState(page, "currentDuck.x");
    expect(leftX).toBeGreaterThanOrEqual(halfW);
  });

  // ---------- 6. Space triggers drop ----------

  test("Space triggers drop", async ({ page }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");

    await startSeededGame(page);

    const beforeFalling = await getGameState(page, "currentDuck.isFalling");
    expect(beforeFalling).toBe(false);

    await page.keyboard.press("Space");

    const afterFalling = await getGameState(page, "currentDuck.isFalling");
    expect(afterFalling).toBe(true);
  });

  // ---------- 7. Click on canvas drops duck ----------

  test("click on canvas drops duck", async ({ page }) => {
    await startSeededGame(page);

    const beforeFalling = await getGameState(page, "currentDuck.isFalling");
    expect(beforeFalling).toBe(false);

    // Click on an area away from the duck (bottom corner of canvas)
    // to trigger the "tap elsewhere -> drop" path
    const canvasBox = await page.locator("#gameCanvas").boundingBox();
    if (!canvasBox) throw new Error("Canvas bounding box not found");

    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.1,
      canvasBox.y + canvasBox.height * 0.9,
    );

    // The click should trigger a drop (isFalling = true)
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.currentDuck?.isFalling === true;
      },
      { timeout: 3000 },
    );

    const afterFalling = await getGameState(page, "currentDuck.isFalling");
    expect(afterFalling).toBe(true);
  });

  // ---------- 8. Drag repositions duck ----------

  test("drag repositions duck", async ({ page }) => {
    await startSeededGame(page);

    const duckX = await getGameState(page, "currentDuck.x");
    const duckY = await getGameState(page, "currentDuck.y");
    expect(typeof duckX).toBe("number");
    expect(typeof duckY).toBe("number");

    // Convert duck position to screen coordinates
    const screenStart = await designToScreen(page, duckX, duckY);

    // mousedown on duck position
    await page.mouse.move(screenStart.x, screenStart.y);
    await page.mouse.down();

    // Wait for drag to register
    await page.waitForTimeout(50);

    const isDragging = await getGameState(page, "isDragging");
    expect(isDragging).toBe(true);

    // mousemove 80 screen pixels to the right (multiple steps for smooth drag)
    await page.mouse.move(screenStart.x + 80, screenStart.y, { steps: 10 });
    await page.waitForTimeout(50);

    const draggedX = await getGameState(page, "currentDuck.x");
    expect(draggedX).toBeGreaterThan(duckX);

    const stillDragging = await getGameState(page, "isDragging");
    expect(stillDragging).toBe(true);

    // Clean up: release mouse
    await page.mouse.up();
  });

  // ---------- 9. Drag release drops duck ----------

  test("drag release drops duck", async ({ page }) => {
    await startSeededGame(page);

    const duckX = await getGameState(page, "currentDuck.x");
    const duckY = await getGameState(page, "currentDuck.y");

    const screenStart = await designToScreen(page, duckX, duckY);

    // Perform drag: down, move, up
    await page.mouse.move(screenStart.x, screenStart.y);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(screenStart.x + 40, screenStart.y, { steps: 5 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // After release, duck should start falling
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.currentDuck?.isFalling === true;
      },
      { timeout: 3000 },
    );

    const isFalling = await getGameState(page, "currentDuck.isFalling");
    expect(isFalling).toBe(true);

    const isDragging = await getGameState(page, "isDragging");
    expect(isDragging).toBe(false);
  });

  // ---------- 10. Auto-drop fires after timeout ----------

  test("auto-drop fires after timeout", async ({ page }) => {
    // At level 0 the auto-drop is max(1500, 5000 - 0*200) = 5000ms.
    // We wait 6000ms without any interaction to let the timer fire.
    test.setTimeout(30000);

    await startSeededGame(page);

    const beforeFalling = await getGameState(page, "currentDuck.isFalling");
    expect(beforeFalling).toBe(false);

    // Do not interact at all. Wait for auto-drop to fire.
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        // Duck has auto-dropped, or the mode changed (landed / game over)
        return (
          gs.currentDuck?.isFalling === true ||
          gs.currentDuck?.isStatic === true ||
          gs.mode === "GAMEOVER"
        );
      },
      { timeout: 8000 },
    );

    // The duck is no longer hovering -- it either started falling or already landed
    const isFalling = await getGameState(page, "currentDuck.isFalling");
    const isStatic = await getGameState(page, "currentDuck.isStatic");
    const mode = await getGameState(page, "mode");
    expect(isFalling === true || isStatic === true || mode === "GAMEOVER").toBe(true);
  });

  // ---------- 11. Multiple arrow key + Space sequence ----------

  test("arrow key sequence then Space positions and drops", async ({
    page,
  }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");

    await startSeededGame(page);
    await page.waitForTimeout(100);

    const initialX = await getGameState(page, "currentDuck.x");

    // ArrowRight x5  (+75px)
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(30);
    }

    // ArrowLeft x3  (-45px)
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(30);
    }

    const positionedX = await getGameState(page, "currentDuck.x");
    // Net movement: +75 - 45 = +30px (clamping may affect this)
    expect(positionedX).toBeCloseTo(initialX + 30, -1);

    // Verify still hovering
    const stillHovering = await getGameState(page, "currentDuck.isFalling");
    expect(stillHovering).toBe(false);

    // Drop with Space
    await page.keyboard.press("Space");

    const isFalling = await getGameState(page, "currentDuck.isFalling");
    expect(isFalling).toBe(true);
  });

  // ---------- 12. New duck after landing hovers ----------

  test("new duck after landing spawns in hover state", async ({ page }, testInfo: TestInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard not available on mobile");
    test.setTimeout(30000);

    await startSeededGame(page);

    // Position duck roughly above the base duck (center) and drop
    const gameWidth = await getGameState(page, "width");
    const duckX = await getGameState(page, "currentDuck.x");
    const centerX = gameWidth / 2;
    const diff = centerX - duckX;
    const stepsNeeded = Math.round(Math.abs(diff) / 15);
    const direction = diff > 0 ? "ArrowRight" : "ArrowLeft";

    for (let i = 0; i < stepsNeeded; i++) {
      await page.keyboard.press(direction);
      await page.waitForTimeout(20);
    }

    // Drop
    await page.keyboard.press("Space");

    // Wait for the duck to land (score increases) or game over
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        const score = gs.score;
        const mode = gs.mode;
        return score > 0 || mode === "GAMEOVER";
      },
      { timeout: 15000 },
    );

    const mode = await getGameState(page, "mode");
    if (mode === "GAMEOVER") {
      // If the game ended, we cannot test new duck spawn -- skip gracefully
      test.skip(true, "Duck missed and triggered game over; cannot verify new spawn");
      return;
    }

    // Wait for the next duck to spawn (spawnInterval is ~2000ms at level 0)
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return (
          gs.currentDuck &&
          !gs.currentDuck.isFalling &&
          !gs.currentDuck.isStatic &&
          !gs.currentDuck.isBeingDragged
        );
      },
      { timeout: 10000 },
    );

    const newIsFalling = await getGameState(page, "currentDuck.isFalling");
    const newIsStatic = await getGameState(page, "currentDuck.isStatic");

    expect(newIsFalling).toBe(false);
    expect(newIsStatic).toBe(false);
  });
});
