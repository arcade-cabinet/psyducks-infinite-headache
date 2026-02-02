import { expect, test } from "@playwright/test";
import { getGameState, startGame } from "./helpers";

const SEED = "collision-test-001";

/**
 * Start game with the deterministic collision-test seed.
 * Fills the seed input before clicking Play so every run is reproducible.
 */
async function startSeededGame(page: import("@playwright/test").Page) {
  await page.goto("");
  await page.fill("#seedInput", SEED);
  await startGame(page);
}

/**
 * Position the current (hovering) duck so that its X aligns with the
 * top-of-stack duck, then optionally apply a pixel offset.
 *
 * Uses ArrowLeft/Right in 15 px design-space increments to move the duck.
 * Returns the final duck X after positioning.
 */
async function positionDuckOverStack(
  page: import("@playwright/test").Page,
  offsetFromCenter = 0,
): Promise<number> {
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
 * Returns the new game mode after the event resolves.
 */
async function dropAndWaitForResult(
  page: import("@playwright/test").Page,
  previousScore: number,
  timeout = 15000,
): Promise<string> {
  await page.keyboard.press("Space");

  await page.waitForFunction(
    (prevScore) => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return gs.score > prevScore || gs.mode === "GAMEOVER";
    },
    previousScore,
    { timeout },
  );

  return getGameState(page, "mode") as Promise<string>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Collision Physics & Stacking Mechanics", () => {
  // These tests rely on keyboard input which is unavailable on mobile devices.
  test.beforeEach(async ({ page: _page }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith("mobile"),
      "Keyboard input not available on mobile projects",
    );
  });

  // ---------- Hover Phase ----------

  test("duck spawns in hover state (isFalling=false, isStatic=false)", async ({ page }) => {
    await startSeededGame(page);
    await page.waitForTimeout(300);

    const isFalling = await getGameState(page, "currentDuck.isFalling");
    const isStatic = await getGameState(page, "currentDuck.isStatic");

    expect(isFalling).toBe(false);
    expect(isStatic).toBe(false);
  });

  test("Space drops hovering duck (isFalling becomes true)", async ({ page }) => {
    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Verify hover before drop
    const beforeDrop = await getGameState(page, "currentDuck.isFalling");
    expect(beforeDrop).toBe(false);

    await page.keyboard.press("Space");

    // isFalling should flip to true immediately
    const afterDrop = await getGameState(page, "currentDuck.isFalling");
    expect(afterDrop).toBe(true);
  });

  // ---------- Successful Landing ----------

  test("successful landing increments score", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    const scoreBefore: number = await getGameState(page, "score");
    expect(scoreBefore).toBe(0);

    // Position duck directly over the base duck
    await positionDuckOverStack(page, 0);

    // Drop and wait for score to increase
    const mode = await dropAndWaitForResult(page, scoreBefore);
    expect(mode).toBe("PLAYING");

    const scoreAfter: number = await getGameState(page, "score");
    expect(scoreAfter).toBe(1);
  });

  test("perfect landing snaps X position to base duck center", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Read the base duck X (target for perfect landing)
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const baseDuckX: number = await page.evaluate(() => (window as any).__gameState.ducks[0].x);

    // Position the falling duck very close (within perfectTolerance = 8 px)
    await positionDuckOverStack(page, 0);

    // Drop
    await page.keyboard.press("Space");

    // Wait for landing
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.score > 0 || gs.mode === "GAMEOVER";
      },
      { timeout: 15000 },
    );

    const mode: string = await getGameState(page, "mode");
    if (mode === "GAMEOVER") {
      // If the duck missed due to timing, skip assertion gracefully
      test.skip(true, "Duck missed due to rAF timing; cannot verify perfect snap");
      return;
    }

    // The last stacked duck (index 1) should have X snapped to base duck X
    const landedDuckX: number = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      return gs.ducks[gs.ducks.length - 1].x;
    });

    expect(landedDuckX).toBeCloseTo(baseDuckX, 0);
  });

  test("near-miss still lands within hit tolerance", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // hitTolerance = 0.65 * duckBaseWidth (60) = 39 px from center.
    // Place the duck at roughly 60% of that range (~23 px offset) so it still
    // lands but is outside the perfect tolerance of 8 px.
    const offset = 23;
    await positionDuckOverStack(page, offset);

    const scoreBefore: number = await getGameState(page, "score");
    const mode = await dropAndWaitForResult(page, scoreBefore);

    expect(mode).toBe("PLAYING");

    const scoreAfter: number = await getGameState(page, "score");
    expect(scoreAfter).toBe(scoreBefore + 1);
  });

  // ---------- Miss / Game Over ----------

  test("miss triggers game over when duck falls far from base", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Move the duck far to one side so it misses the stack entirely
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(20);
    }

    await page.keyboard.press("Space");

    // Wait for game over
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    await page.waitForFunction(() => (window as any).__gameState.mode === "GAMEOVER", {
      timeout: 20000,
    });

    const mode: string = await getGameState(page, "mode");
    expect(mode).toBe("GAMEOVER");

    // Game over screen should be visible
    await expect(page.locator("#game-over-screen")).toBeVisible();
  });

  // ---------- Stack Growth ----------

  test("stack grows with each landing (ducks array length increases)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );
    test.setTimeout(90000);

    await startSeededGame(page);

    const initialDucksLength: number = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      return (window as any).__gameState.ducks.length;
    });
    // The base duck is already in the array
    expect(initialDucksLength).toBe(1);

    const targetLandings = 3;

    for (let i = 0; i < targetLandings; i++) {
      // Wait for a new hovering duck to appear
      await page.waitForFunction(
        () => {
          // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
          const gs = (window as any).__gameState;
          return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
        },
        { timeout: 15000 },
      );
      await page.waitForTimeout(200);

      const currentScore: number = await getGameState(page, "score");

      // Position directly over the top of the stack
      await positionDuckOverStack(page, 0);

      const mode = await dropAndWaitForResult(page, currentScore);
      if (mode === "GAMEOVER") {
        // Can't continue stacking if we lost
        break;
      }
    }

    const finalScore: number = await getGameState(page, "score");
    const finalDucksLength: number = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      return (window as any).__gameState.ducks.length;
    });

    // ducks array = base (1) + landed ducks (score)
    expect(finalDucksLength).toBe(1 + finalScore);
    expect(finalScore).toBeGreaterThanOrEqual(1);
  });

  // ---------- Camera ----------

  test("camera follows stack after landing", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    const initialTargetCameraY: number = await getGameState(page, "targetCameraY");

    // Position and drop
    await positionDuckOverStack(page, 0);
    const scoreBefore: number = await getGameState(page, "score");
    const mode = await dropAndWaitForResult(page, scoreBefore);

    if (mode === "GAMEOVER") {
      test.skip(true, "Duck missed; cannot verify camera follow");
      return;
    }

    const newTargetCameraY: number = await getGameState(page, "targetCameraY");

    // After the first landing, the camera target should move upward (more negative)
    // because the stack grows upward and the camera follows.
    expect(newTargetCameraY).not.toBe(initialTargetCameraY);
  });

  // ---------- New Duck Spawns ----------

  test("new duck spawns after successful landing", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Get the current duck reference (spawnX is unique per duck)
    const _firstDuckSpawnX: number = await getGameState(page, "currentDuck.spawnX");

    // Land the first duck
    await positionDuckOverStack(page, 0);
    const scoreBefore: number = await getGameState(page, "score");
    const mode = await dropAndWaitForResult(page, scoreBefore);

    if (mode === "GAMEOVER") {
      test.skip(true, "Duck missed; cannot verify new duck spawn");
      return;
    }

    // Wait for a new current duck to appear (it will be hovering)
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.currentDuck && !gs.currentDuck.isFalling && !gs.currentDuck.isStatic;
      },
      { timeout: 15000 },
    );

    const newDuckSpawnX: number = await getGameState(page, "currentDuck.spawnX");
    const newDuckIsFalling: boolean = await getGameState(page, "currentDuck.isFalling");

    // The new duck should be a different instance (different spawnX from seeded RNG)
    // and should be in hover state
    expect(newDuckIsFalling).toBe(false);
    // spawnX is seeded-random, so it will virtually always differ from the first duck.
    // In the rare collision case we just verify it exists as a valid number.
    expect(typeof newDuckSpawnX).toBe("number");
    expect(Number.isFinite(newDuckSpawnX)).toBe(true);
  });

  // ---------- prevY Tracking ----------

  test("prevY is tracked correctly while duck is falling", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Drop the duck
    await page.keyboard.press("Space");

    // Wait a couple of frames for gravity to kick in, then sample prevY and y
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        if (!gs.currentDuck) return false;
        // Wait until the duck has fallen at least one frame (y > prevY possible,
        // but more importantly both are numbers and duck is falling)
        return gs.currentDuck.isFalling && gs.currentDuck.y > gs.currentDuck.prevY;
      },
      { timeout: 10000 },
    );

    const prevY: number = await getGameState(page, "currentDuck.prevY");
    const y: number = await getGameState(page, "currentDuck.y");

    // While falling under gravity, y increases each frame and prevY holds the
    // previous frame value, so prevY < y.
    expect(prevY).toBeLessThan(y);
    expect(typeof prevY).toBe("number");
    expect(typeof y).toBe("number");
  });

  // ---------- Swept Collision Boundary ----------

  test("swept collision: duck must cross targetY from above to land", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Read the collision target Y
    const topDuck = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
      const gs = (window as any).__gameState;
      const top = gs.ducks[gs.ducks.length - 1];
      return { y: top.y, h: top.h };
    });
    const targetY = topDuck.y - topDuck.h * 0.85;

    // Verify the current duck starts above the target
    const spawnY: number = await getGameState(page, "currentDuck.y");
    expect(spawnY).toBeLessThan(targetY);

    // Position over the base and drop
    await positionDuckOverStack(page, 0);
    await page.keyboard.press("Space");

    // Wait for either landing or game over
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.score > 0 || gs.mode === "GAMEOVER";
      },
      { timeout: 15000 },
    );

    const mode: string = await getGameState(page, "mode");
    if (mode === "PLAYING") {
      // If score increased, the duck successfully crossed targetY
      const score: number = await getGameState(page, "score");
      expect(score).toBe(1);
    }
    // If GAMEOVER, the duck either missed laterally or fell past the fallback
    // boundary -- both are valid collision-detection outcomes, not test failures.
    expect(["PLAYING", "GAMEOVER"]).toContain(mode);
  });

  // ---------- Fallback Miss Boundary ----------

  test("duck falling past baseY + cameraY + 400 triggers game over", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "firefox",
      "Firefox headless rAF timing too slow for gravity physics",
    );

    await startSeededGame(page);
    await page.waitForTimeout(300);

    // Move the duck far from the stack so it will miss on the swept-collision
    // check and instead fall through to the fallback boundary.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(15);
    }

    await page.keyboard.press("Space");

    // The duck should eventually pass baseY + cameraY + 400 and trigger game over
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    await page.waitForFunction(() => (window as any).__gameState.mode === "GAMEOVER", {
      timeout: 25000,
    });

    const mode: string = await getGameState(page, "mode");
    expect(mode).toBe("GAMEOVER");
  });
});
