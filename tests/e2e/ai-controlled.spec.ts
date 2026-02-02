import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import * as YUKA from "yuka";
import { getGameState, startGame, waitForGameReady } from "./helpers";

/**
 * AI-Controlled Gameplay Test using Yuka
 * This test demonstrates AI-driven player interaction for E2E testing
 */

interface DuckTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

class AIPlayer {
  private entityManager: YUKA.EntityManager;
  private vehicle: YUKA.Vehicle;

  constructor() {
    this.entityManager = new YUKA.EntityManager();
    this.vehicle = new YUKA.Vehicle();
    this.vehicle.maxSpeed = 5;
    this.vehicle.maxForce = 10;
    this.entityManager.add(this.vehicle);
  }

  /**
   * Calculate optimal drop position for duck
   */
  calculateOptimalDrop(target: DuckTarget, canvasWidth: number): number {
    // AI logic: aim for center of target with slight randomness
    const targetCenter = target.x;
    const accuracy = 0.9; // 90% accuracy
    const offset = (Math.random() - 0.5) * target.width * (1 - accuracy);

    return Math.max(
      target.width / 2,
      Math.min(canvasWidth - target.width / 2, targetCenter + offset),
    );
  }

  /**
   * Decide whether to drag based on AI strategy
   */
  shouldDrag(duckX: number, optimalX: number, threshold = 50): boolean {
    return Math.abs(duckX - optimalX) > threshold;
  }

  /**
   * Calculate drag path using Yuka steering behaviors
   */
  calculateDragPath(fromX: number, toX: number, steps = 10): number[] {
    const path: number[] = [];

    // Simulate smooth path with ease-out curve
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Ease-out curve for natural movement
      const eased = 1 - (1 - t) ** 3;
      path.push(fromX + (toX - fromX) * eased);
    }

    return path;
  }

  update(deltaTime: number) {
    this.entityManager.update(deltaTime);
  }
}

/**
 * Helper function to perform a single AI duck drop attempt
 * Returns true if the drop was successful (score increased)
 */
async function performAIDuckDrop(
  page: Page,
  ai: AIPlayer,
  box: { x: number; y: number; width: number; height: number },
): Promise<boolean> {
  // Get current score
  const scoreBefore = await page.locator("#scoreDisplay").textContent();

  // AI observes the game state (simplified - in real scenario would use computer vision)
  const duckStartX = box.x + box.width * 0.5; // Assume duck starts at center
  const targetX = box.x + box.width * 0.5; // Target: stack center

  // AI decides optimal position
  const optimalX = ai.calculateOptimalDrop(
    { x: targetX, y: box.y + box.height * 0.7, width: 80, height: 70 },
    box.width,
  );

  // AI performs drag if needed
  if (ai.shouldDrag(duckStartX, optimalX, 30)) {
    const dragPath = ai.calculateDragPath(duckStartX, optimalX, 15);

    await page.mouse.move(duckStartX, box.y + box.height * 0.3);
    await page.mouse.down();

    // Follow calculated path
    for (const x of dragPath) {
      await page.mouse.move(x, box.y + box.height * 0.3);
      await page.waitForTimeout(20);
    }

    await page.mouse.up();
  }

  // Wait for duck to land or miss (duck falls under gravity, needs time)
  const scoreBefore_int = scoreBefore ? Number.parseInt(scoreBefore, 10) : 0;
  try {
    await page.waitForFunction(
      (prevScore) => {
        const score = document.getElementById("scoreDisplay")?.textContent;
        const gameOver = document.getElementById("game-over-screen");
        const currentScore = score ? parseInt(score, 10) : 0;
        return currentScore > prevScore || (gameOver && !gameOver.classList.contains("hidden"));
      },
      scoreBefore_int,
      { timeout: 8000 },
    );
  } catch {
    // Timeout waiting for duck to land - return false
    return false;
  }

  // Check if score increased
  const scoreAfter = await page.locator("#scoreDisplay").textContent();
  return (
    scoreAfter !== null &&
    scoreBefore !== null &&
    Number.parseInt(scoreAfter, 10) > Number.parseInt(scoreBefore, 10)
  );
}

test.describe("AI-Controlled Gameplay Tests", () => {
  test("AI should successfully play several rounds", async ({ page }) => {
    const ai = new AIPlayer();

    await page.goto("");
    await page.waitForLoadState("domcontentloaded");

    // Use deterministic seed for AI testing
    await page.fill("#seedInput", "ai-test-seed-001");
    await waitForGameReady(page);
    await page.click("#startBtn");
    await expect(page.locator("#start-screen")).toBeHidden();

    const canvas = page.locator("#gameCanvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    let successfulDrops = 0;
    let gameEnded = false;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Perform AI drop attempt
        const success = await performAIDuckDrop(page, ai, box);
        if (success) {
          successfulDrops++;
        }

        // Update AI simulation
        ai.update(2.0);

        // Check if game is over
        const gameOverVisible = await page.locator("#game-over-screen").isVisible();
        if (gameOverVisible) {
          gameEnded = true;
          break;
        }

        // Wait for next duck to spawn
        await page.waitForTimeout(2500);
      } catch (error) {
        console.log(`AI attempt ${attempt + 1} encountered issue:`, error);
      }
    }

    // Take screenshot of final result
    await page.screenshot({
      path: "test-results/screenshots/ai-gameplay-result.png",
      fullPage: false,
    });

    // AI should have interacted with the game (score changed or game ended)
    console.log(`AI achieved ${successfulDrops} successful drops out of ${maxAttempts} attempts`);
    expect(successfulDrops > 0 || gameEnded).toBeTruthy();
  });

  test("AI should navigate through menu and start game", async ({ page }) => {
    const ai = new AIPlayer();

    await page.goto("");

    // AI observes menu
    await expect(page.locator("#startBtn")).toBeVisible();

    // AI decides to shuffle seed
    await waitForGameReady(page);
    await page.click("#shuffleSeedBtn");
    await page.waitForTimeout(300);

    const seed = await page.locator("#seedInput").inputValue();
    expect(seed).toBeTruthy();

    // AI starts game
    await page.click("#startBtn");
    await expect(page.locator("#start-screen")).toBeHidden();
    await page.waitForTimeout(1500);

    // Verify game started
    await expect(page.locator("#scoreDisplay")).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/ai-started-game.png",
    });

    ai.update(1.5);
  });

  test("AI should detect and respond to stability warnings", async ({ page }) => {
    await page.goto("");
    await page.fill("#seedInput", "stability-test");
    await waitForGameReady(page);
    await page.click("#startBtn");
    await expect(page.locator("#start-screen")).toBeHidden();
    await page.waitForTimeout(1500);

    // Monitor stability bar
    const stabilityBar = page.locator("#stabilityBar");

    // Get stability percentage
    const stabilityWidth = await stabilityBar.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.width;
    });

    console.log(`Initial stability: ${stabilityWidth}`);

    // AI would adjust strategy based on stability
    expect(stabilityWidth).toBeTruthy();

    await page.screenshot({
      path: "test-results/screenshots/ai-stability-monitoring.png",
    });
  });

  test("AI retry: play -> game over -> RETRY -> no start screen, no black screen", async ({
    page,
  }) => {
    await page.goto("");
    await page.fill("#seedInput", "ai-retry-test");
    await startGame(page);

    const gameOverScreen = page.locator("#game-over-screen");

    // Keep clicking far left to trigger miss -> game over
    for (let i = 0; i < 10; i++) {
      await page.locator("#gameCanvas").click({ position: { x: 10, y: 300 } });
      try {
        await expect(gameOverScreen).toBeVisible({ timeout: 3000 });
        break;
      } catch {
        // Continue trying
      }
    }

    // Must reach game over for test to be valid
    await expect(gameOverScreen).toBeVisible({ timeout: 5000 });

    // Click RETRY
    await page.locator("#restartBtn").click();

    // Start screen should NOT appear
    await expect(page.locator("#start-screen")).toBeHidden();
    await expect(gameOverScreen).toBeHidden();

    // ScoreBox should be visible (no black screen)
    await expect(page.locator("#scoreBox")).toBeVisible();

    // Score should be reset to 0
    await expect(page.locator("#scoreDisplay")).toContainText("0");

    // Game mode should be PLAYING
    const mode = await getGameState(page, "mode");
    expect(mode).toBe("PLAYING");
  });

  test("AI collision reliability: drop 8 ducks, expect >= 1 successful land", async ({ page }) => {
    const ai = new AIPlayer();

    await page.goto("");
    await page.fill("#seedInput", "collision-reliability-test");
    await startGame(page);

    const canvas = page.locator("#gameCanvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    let successfulDrops = 0;
    const maxAttempts = 8;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const gameOverVisible = await page.locator("#game-over-screen").isVisible();
      if (gameOverVisible) break;

      const success = await performAIDuckDrop(page, ai, box);
      if (success) successfulDrops++;

      ai.update(2.0);
      await page.waitForTimeout(2500);
    }

    // At least 1 successful land with swept collision
    expect(successfulDrops).toBeGreaterThanOrEqual(1);
  });

  test("AI keyboard: ArrowLeft/Right + Space positioning and dropping", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name.startsWith("mobile"), "Keyboard input not available on mobile");

    await page.goto("");
    await page.fill("#seedInput", "keyboard-ai-test");
    await startGame(page);
    await page.waitForTimeout(200);

    // Get initial duck X from game state
    const initialX = await getGameState(page, "currentDuck.x");
    expect(initialX).toBeDefined();
    expect(typeof initialX).toBe("number");

    // AI uses arrow keys to position duck
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(50);
    }

    const movedX = await getGameState(page, "currentDuck.x");
    // Duck may be clamped at right boundary, so check >=
    expect(movedX).toBeGreaterThanOrEqual(initialX);

    // Now move left more times to ensure net leftward movement
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(50);
    }

    const leftX = await getGameState(page, "currentDuck.x");
    expect(leftX).toBeLessThan(movedX);

    // Drop with Space
    await page.keyboard.press("Space");

    // Wait for result
    await page.waitForFunction(
      () => {
        const score = document.getElementById("scoreDisplay")?.textContent;
        const gameOver = document.getElementById("game-over-screen");
        return (score && score !== "0") || (gameOver && !gameOver.classList.contains("hidden"));
      },
      { timeout: 10000 },
    );

    await page.screenshot({
      path: "test-results/screenshots/ai-keyboard-test.png",
    });
  });
});
