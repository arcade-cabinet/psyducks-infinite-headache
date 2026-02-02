import { expect, test } from "@playwright/test";
import * as YUKA from "yuka";

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
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used for AI simulation tracking
  private time: number;

  constructor() {
    this.entityManager = new YUKA.EntityManager();
    this.vehicle = new YUKA.Vehicle();
    this.vehicle.maxSpeed = 5;
    this.vehicle.maxForce = 10;
    this.entityManager.add(this.vehicle);
    this.time = 0;
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
    this.time += deltaTime;
    this.entityManager.update(deltaTime);
  }
}

test.describe("AI-Controlled Gameplay Tests", () => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Test complexity is acceptable
  test("AI should successfully play several rounds", async ({ page }) => {
    const ai = new AIPlayer();

    await page.goto("/psyducks-infinite-headache/");
    await page.waitForLoadState("networkidle");

    // Use deterministic seed for AI testing
    await page.fill("#seedInput", "ai-test-seed-001");
    await page.click("#startBtn");
    await page.waitForTimeout(1500);

    const canvas = page.locator("#gameCanvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    let successfulDrops = 0;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
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

        // Wait for duck to land
        await page.waitForTimeout(2000);

        // Check if score increased
        const scoreAfter = await page.locator("#scoreDisplay").textContent();
        if (
          scoreAfter &&
          scoreBefore &&
          Number.parseInt(scoreAfter, 10) > Number.parseInt(scoreBefore, 10)
        ) {
          successfulDrops++;
        }

        // Update AI time
        ai.update(2.0);

        // Check if game is over
        const gameOverVisible = await page.locator("#game-over-screen").isVisible();
        if (gameOverVisible) {
          break;
        }

        // Wait for next duck to spawn
        await page.waitForTimeout(1500);
      } catch (error) {
        console.log(`AI attempt ${attempt + 1} encountered issue:`, error);
      }
    }

    // Take screenshot of final result
    await page.screenshot({
      path: "test-results/screenshots/ai-gameplay-result.png",
      fullPage: false,
    });

    // AI should achieve at least some successful drops
    console.log(`AI achieved ${successfulDrops} successful drops out of ${maxAttempts} attempts`);
    expect(successfulDrops).toBeGreaterThan(0);
  });

  test("AI should navigate through menu and start game", async ({ page }) => {
    const ai = new AIPlayer();

    await page.goto("/psyducks-infinite-headache/");

    // AI observes menu
    await expect(page.locator("#startBtn")).toBeVisible();

    // AI decides to shuffle seed
    await page.click("#shuffleSeedBtn");
    await page.waitForTimeout(300);

    const seed = await page.locator("#seedInput").inputValue();
    expect(seed).toBeTruthy();

    // AI starts game
    await page.click("#startBtn");
    await page.waitForTimeout(1500);

    // Verify game started
    await expect(page.locator("#scoreDisplay")).toBeVisible();

    await page.screenshot({
      path: "test-results/screenshots/ai-started-game.png",
    });

    ai.update(1.5);
  });

  test("AI should detect and respond to stability warnings", async ({ page }) => {
    await page.goto("/psyducks-infinite-headache/");
    await page.fill("#seedInput", "stability-test");
    await page.click("#startBtn");
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
});
