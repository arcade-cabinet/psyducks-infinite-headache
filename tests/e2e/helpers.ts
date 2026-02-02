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
