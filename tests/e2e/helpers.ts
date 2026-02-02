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
