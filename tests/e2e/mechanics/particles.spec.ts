import { expect, test } from "@playwright/test";
import {
  clearParticles,
  getParticleCount,
  getParticlePositions,
  positionDuckPrecisely,
  startGame,
  waitForDuckLandingResult,
  waitForGameReady,
  waitForParticles,
} from "../../e2e/helpers";

test.describe("Particle System Mechanics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("");
    await waitForGameReady(page);
    await startGame(page);
  });

  test("should spawn particles on perfect landing", async ({ page }) => {
    await clearParticles(page);
    await positionDuckPrecisely(page, 0); // Perfect center
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);

    const count = await waitForParticles(page);
    expect(count).toBeGreaterThan(0);
  });

  test("particles should decay and be removed", async ({ page }) => {
    await clearParticles(page);
    await positionDuckPrecisely(page, 0);
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);
    await waitForParticles(page);

    // Wait for decay (particles have life ~1.0, decay 0.03 per frame => ~33 frames => ~0.5s)
    await page.waitForTimeout(1000);

    const finalCount = await getParticleCount(page);
    expect(finalCount).toBe(0);
  });

  test("should spawn particles at correct location", async ({ page }) => {
    await clearParticles(page);
    const { finalX } = await positionDuckPrecisely(page, 0);
    await page.keyboard.press("Space");
    await waitForDuckLandingResult(page, 0);

    const particles = await getParticlePositions(page);
    // Should be clustered around duck position (finalX)
    const avgX = particles.reduce((sum, p) => sum + p.x, 0) / particles.length;

    // Check roughly centered (within tolerance)
    expect(Math.abs(avgX - finalX)).toBeLessThan(50);
  });
});
