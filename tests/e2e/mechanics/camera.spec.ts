import { expect, test } from "@playwright/test";
import {
  calculateTargetY,
  getCameraState,
  getGameState,
  positionDuckOverStack,
  startGame,
  waitForCameraStabilize,
  waitForDuckLandingResult,
  waitForGameReady,
} from "../../e2e/helpers";

test.describe("Camera Mechanics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
  });

  test("camera should track stack height on landing", async ({ page }) => {
    await startGame(page);
    await positionDuckOverStack(page, 0);

    const initialCameraY = (await getCameraState(page)).cameraY;

    // Drop duck
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);

    // Wait for camera to stabilize
    await waitForCameraStabilize(page, 5000);

    const finalCameraY = (await getCameraState(page)).cameraY;

    // Camera should have moved up (negative Y or positive depending on coord system, but different)
    // Actually, in game coords, Y increases downwards, so as stack grows upwards (decreasing Y),
    // cameraY should decrease (move up) to keep stack in view?
    // Let's check logic: targetCameraY = falling.y - desiredScreenY
    // falling.y is usually negative (above screen) then lands on stack (positive Y)
    // As stack gets higher (smaller Y), targetCameraY gets smaller (more negative/less positive)
    expect(finalCameraY).not.toBe(initialCameraY);
  });

  test("camera should smooth interpolate towards target", async ({ page }) => {
    await startGame(page);
    await positionDuckOverStack(page, 0);

    // Drop duck and wait for landing (which sets the new camera target)
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);

    // Check camera state immediately after landing (should be start of interpolation)
    const startState = await getCameraState(page);

    // Wait a bit for interpolation to progress
    await page.waitForTimeout(200);

    const midState = await getCameraState(page);

    // Should be moving towards target (so position should have changed)
    expect(midState.cameraY).not.toBe(startState.cameraY);
  });

  test("camera should reset on restart", async ({ page }) => {
    await startGame(page);
    
    // Stack a few ducks to move camera
    for (let i = 0; i < 3; i++) {
      await positionDuckOverStack(page, 0);
      await page.keyboard.press("Space");
      await waitForDuckLandingResult(page, i);
      // Allow time for camera to move
      await page.waitForTimeout(1000); 
    }

    const highStackCameraY = (await getCameraState(page)).cameraY;

    // Trigger game over (miss stack)
    await page.keyboard.press("ArrowRight"); // move away
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space"); // drop miss

    // Wait for game over
    await expect(page.locator("#game-over-screen")).toBeVisible();

    // Restart
    await page.click("#restartBtn");

    // Wait for restart
    await expect(page.locator("#scoreBox")).toBeVisible();

    // Camera should be reset to near 0
    const resetCameraY = (await getCameraState(page)).cameraY;
    expect(Math.abs(resetCameraY)).toBeLessThan(50);
  });
});
