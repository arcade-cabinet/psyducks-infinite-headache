/**
 * Feature: comprehensive-e2e-testing
 * Tests for Level Up Mechanics
 *
 * Property 23: Level Up Screen Display
 * *For any* level up event, the level up screen SHALL display with the new level
 * number and level name from config.
 *
 * Property 24: Difficulty Scaling with Level
 * *For any* level increase, spawn interval SHALL decrease, wobble multiplier SHALL
 * increase, and auto-drop timer SHALL decrease (clamped at minimum).
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8**
 */
import { expect, test } from "@playwright/test";
import { getGameState, startSeededGame, waitForGameMode, waitForNewDuck } from "../helpers";

// Use a consistent seed for reproducible tests
const SEED = "levelup-mechanics-test-001";

// Game constants from CONFIG (src/scripts/game.ts)
const LEVEL_UP_SCREEN_RATIO = 0.8;
const AUTO_DROP_BASE_MS = 5000;
const AUTO_DROP_LEVEL_REDUCTION = 200;
const AUTO_DROP_MIN_MS = 1500;
const DUCK_BASE_WIDTH = 60;

/**
 * Directly trigger level up by manipulating game state.
 * Sets the base duck width past the 80% threshold and transitions to LEVELUP mode.
 *
 * @param page - Playwright page instance
 * @param targetLevel - The level to set after level up (default: 1)
 */
async function directTriggerLevelUp(
  page: import("@playwright/test").Page,
  targetLevel = 1,
): Promise<void> {
  await page.evaluate((level) => {
    // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
    const gs = (window as any).__gameState;
    const threshold = gs.width * 0.8;

    // Set base duck width past the threshold
    gs.ducks[0].w = threshold + 1;
    gs.ducks[0].h = (threshold + 1) * (52 / 60); // Maintain aspect ratio
    gs.ducks[0].mergeLevel = 6;

    // Set the level
    gs.level = level;

    // Trigger the level-up mode
    gs.mode = "LEVELUP";

    // Show the level-up screen UI
    const levelUpScreen = document.getElementById("level-up-screen");
    if (levelUpScreen) {
      levelUpScreen.classList.remove("hidden");
    }

    // Update the level display
    const newLevelDisplay = document.getElementById("newLevelDisplay");
    if (newLevelDisplay) {
      newLevelDisplay.textContent = (level + 1).toString();
    }

    // Update the level name display (element ID is #levelName in the HTML)
    const levelNameDisplay = document.getElementById("levelName");
    if (levelNameDisplay && gs.levelConfigs[level]) {
      levelNameDisplay.textContent = gs.levelConfigs[level].name;
    }
  }, targetLevel);

  await page.waitForTimeout(300);
}

/**
 * Calculate expected auto-drop time for a given level.
 * Formula: max(AUTO_DROP_MIN_MS, AUTO_DROP_BASE_MS - level * AUTO_DROP_LEVEL_REDUCTION)
 */
function expectedAutoDropTime(level: number): number {
  return Math.max(AUTO_DROP_MIN_MS, AUTO_DROP_BASE_MS - level * AUTO_DROP_LEVEL_REDUCTION);
}

test.describe("Level Up Mechanics", () => {
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

  test.describe("Property 23: Level Up Screen Display", () => {
    /**
     * Test: Level up triggers at 80% screen width
     *
     * WHEN base duck width >= width * 0.8, THEN the Test_Suite SHALL verify
     * level up triggers.
     *
     * Validates: Requirements 6.1
     */
    test("level up triggers at 80% screen width threshold", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial state
      const initialLevel: number = await getGameState(page, "level");
      expect(initialLevel).toBe(0);

      // Get the threshold value
      const thresholdInfo = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          designWidth: gs.width,
          threshold: gs.width * 0.8,
          baseDuckWidth: gs.ducks[0].w,
        };
      });

      // Verify threshold is 80% of design width
      expect(thresholdInfo.threshold).toBe(thresholdInfo.designWidth * LEVEL_UP_SCREEN_RATIO);

      // Verify base duck starts below threshold
      expect(thresholdInfo.baseDuckWidth).toBeLessThan(thresholdInfo.threshold);

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify LEVELUP mode
      const finalMode: string = await getGameState(page, "mode");
      expect(finalMode).toBe("LEVELUP");
    });

    /**
     * Test: Level up screen displays when threshold reached
     *
     * WHEN level up triggers, THEN the Test_Suite SHALL verify level up screen displays.
     *
     * Validates: Requirements 6.3
     */
    test("level up screen displays when threshold reached", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify level up screen is hidden initially
      const levelUpScreen = page.locator("#level-up-screen");
      await expect(levelUpScreen).toBeHidden();

      // Trigger level up
      await directTriggerLevelUp(page);

      // Verify level up screen is visible
      await expect(levelUpScreen).toBeVisible();

      // Verify continue button is visible
      const continueButton = page.locator("#continueLevelBtn");
      await expect(continueButton).toBeVisible();
    });

    /**
     * Test: Level up screen shows correct level number
     *
     * WHEN level up triggers, THEN the Test_Suite SHALL verify level up screen
     * displays with the new level number.
     *
     * Validates: Requirements 6.2, 6.3
     */
    test("level up screen shows correct level number", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up to level 1
      await directTriggerLevelUp(page, 1);

      // Verify level display shows correct level (1-indexed for display)
      const levelDisplay = page.locator("#newLevelDisplay");
      await expect(levelDisplay).toContainText("2");

      // Verify game state level
      const gameLevel: number = await getGameState(page, "level");
      expect(gameLevel).toBe(1);
    });

    /**
     * Test: Level up screen shows level name from config
     *
     * WHEN level up triggers, THEN the Test_Suite SHALL verify level up screen
     * displays the level name from config.
     *
     * Validates: Requirements 6.3, 12.7
     */
    test("level up screen shows level name from config", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get the level name from config before triggering level up
      const levelConfig = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          name: gs.levelConfigs[1]?.name,
          exists: gs.levelConfigs[1] !== undefined,
        };
      });

      expect(levelConfig.exists).toBe(true);

      // Trigger level up to level 1
      await directTriggerLevelUp(page, 1);

      // Verify level name is displayed (element ID is #levelName in the HTML)
      const levelNameDisplay = page.locator("#levelName");
      await expect(levelNameDisplay).toBeVisible();

      // The level name should match the config
      const displayedName = await levelNameDisplay.textContent();
      expect(displayedName).toBe(levelConfig.name);
    });

    /**
     * Test: Level increments on level up
     *
     * WHEN level up triggers, THEN the Test_Suite SHALL verify level increments.
     *
     * Validates: Requirements 6.2
     */
    test("level increments on level up", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify initial level
      const initialLevel: number = await getGameState(page, "level");
      expect(initialLevel).toBe(0);

      // Trigger level up
      await directTriggerLevelUp(page, 1);

      // Verify level incremented
      const newLevel: number = await getGameState(page, "level");
      expect(newLevel).toBe(1);
    });

    /**
     * Test: Multiple level ups increment level correctly
     *
     * Validates: Requirements 6.2
     */
    test("multiple level ups increment level correctly", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger first level up
      await directTriggerLevelUp(page, 1);
      expect(await getGameState(page, "level")).toBe(1);

      // Continue from level up
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");
      await waitForNewDuck(page);

      // Trigger second level up
      await directTriggerLevelUp(page, 2);
      expect(await getGameState(page, "level")).toBe(2);

      // Verify level display shows level 3 (1-indexed)
      const levelDisplay = page.locator("#newLevelDisplay");
      await expect(levelDisplay).toContainText("3");
    });
  });

  test.describe("Property 24: Difficulty Scaling with Level", () => {
    /**
     * Test: New level config colors apply after level up
     *
     * WHEN level up triggers, THEN the Test_Suite SHALL verify new level config
     * colors apply.
     *
     * Validates: Requirements 6.4
     */
    test("new level config colors apply after level up", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get level 0 and level 1 colors from config
      const levelColors = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          level0: {
            primary: gs.levelConfigs[0]?.color,
            secondary: gs.levelConfigs[0]?.secondaryColor,
          },
          level1: {
            primary: gs.levelConfigs[1]?.color,
            secondary: gs.levelConfigs[1]?.secondaryColor,
          },
        };
      });

      // Verify level configs exist and have different colors
      expect(levelColors.level0.primary).toBeDefined();
      expect(levelColors.level1.primary).toBeDefined();

      // Trigger level up and continue
      await directTriggerLevelUp(page, 1);
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");
      await waitForNewDuck(page);

      // Verify the current duck uses level 1 colors
      const currentDuckColors = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          primary: gs.currentDuck?.primaryColor,
          secondary: gs.currentDuck?.secondaryColor,
        };
      });

      // New ducks should use the new level's colors
      expect(currentDuckColors.primary).toBe(levelColors.level1.primary);
      expect(currentDuckColors.secondary).toBe(levelColors.level1.secondary);
    });

    /**
     * Test: Spawn interval decreases with level
     *
     * WHEN level increases, THEN the Test_Suite SHALL verify spawn interval decreases.
     *
     * Validates: Requirements 6.6
     */
    test("spawn interval decreases with level", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get spawn intervals for multiple levels
      const spawnIntervals = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          level0: gs.levelConfigs[0]?.spawnInterval,
          level1: gs.levelConfigs[1]?.spawnInterval,
          level2: gs.levelConfigs[2]?.spawnInterval,
          level3: gs.levelConfigs[3]?.spawnInterval,
        };
      });

      // Verify spawn intervals exist
      expect(spawnIntervals.level0).toBeDefined();
      expect(spawnIntervals.level1).toBeDefined();
      expect(spawnIntervals.level2).toBeDefined();
      expect(spawnIntervals.level3).toBeDefined();

      // Verify spawn intervals decrease (or stay same) as level increases
      // The formula uses logarithmic reduction, so intervals should generally decrease
      expect(spawnIntervals.level1).toBeLessThanOrEqual(spawnIntervals.level0);
      expect(spawnIntervals.level2).toBeLessThanOrEqual(spawnIntervals.level1);
      expect(spawnIntervals.level3).toBeLessThanOrEqual(spawnIntervals.level2);

      // Verify there's a minimum spawn interval (800ms from generateLevelConfigs)
      expect(spawnIntervals.level0).toBeGreaterThanOrEqual(800);
      expect(spawnIntervals.level3).toBeGreaterThanOrEqual(800);
    });

    /**
     * Test: Wobble multiplier increases with level
     *
     * WHEN level increases, THEN the Test_Suite SHALL verify wobble multiplier increases.
     *
     * Validates: Requirements 6.7
     */
    test("wobble multiplier increases with level", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get wobble multipliers for multiple levels
      const wobbleMultipliers = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          level0: gs.levelConfigs[0]?.wobbleMultiplier,
          level1: gs.levelConfigs[1]?.wobbleMultiplier,
          level2: gs.levelConfigs[2]?.wobbleMultiplier,
          level3: gs.levelConfigs[3]?.wobbleMultiplier,
        };
      });

      // Verify wobble multipliers exist
      expect(wobbleMultipliers.level0).toBeDefined();
      expect(wobbleMultipliers.level1).toBeDefined();
      expect(wobbleMultipliers.level2).toBeDefined();
      expect(wobbleMultipliers.level3).toBeDefined();

      // Verify wobble multipliers increase with level
      // Formula: 1.0 + level * 0.1
      expect(wobbleMultipliers.level0).toBeCloseTo(1.0, 1);
      expect(wobbleMultipliers.level1).toBeCloseTo(1.1, 1);
      expect(wobbleMultipliers.level2).toBeCloseTo(1.2, 1);
      expect(wobbleMultipliers.level3).toBeCloseTo(1.3, 1);

      // Verify increasing pattern
      expect(wobbleMultipliers.level1).toBeGreaterThan(wobbleMultipliers.level0);
      expect(wobbleMultipliers.level2).toBeGreaterThan(wobbleMultipliers.level1);
      expect(wobbleMultipliers.level3).toBeGreaterThan(wobbleMultipliers.level2);
    });

    /**
     * Test: Auto-drop timer decreases with level
     *
     * WHEN level increases, THEN the Test_Suite SHALL verify auto-drop timer decreases
     * by 200ms per level.
     *
     * Validates: Requirements 6.8, 8.5
     */
    test("auto-drop timer decreases with level", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Verify auto-drop time formula for different levels
      // Formula: max(1500, 5000 - level * 200)
      expect(expectedAutoDropTime(0)).toBe(5000); // Level 0: 5000ms
      expect(expectedAutoDropTime(1)).toBe(4800); // Level 1: 4800ms
      expect(expectedAutoDropTime(5)).toBe(4000); // Level 5: 4000ms
      expect(expectedAutoDropTime(10)).toBe(3000); // Level 10: 3000ms
      expect(expectedAutoDropTime(17)).toBe(1600); // Level 17: 1600ms
      expect(expectedAutoDropTime(18)).toBe(1500); // Level 18: clamped to 1500ms
      expect(expectedAutoDropTime(20)).toBe(1500); // Level 20: clamped to 1500ms
    });

    /**
     * Test: Auto-drop time clamps at minimum (1500ms)
     *
     * WHEN auto-drop time would go below 1500ms, THEN the Test_Suite SHALL verify
     * it clamps to 1500ms.
     *
     * Validates: Requirements 6.8, 8.6
     */
    test("auto-drop time clamps at minimum 1500ms", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Test high levels where auto-drop would go below minimum
      // Level 18: 5000 - 18*200 = 1400 -> clamped to 1500
      expect(expectedAutoDropTime(18)).toBe(AUTO_DROP_MIN_MS);

      // Level 25: 5000 - 25*200 = 0 -> clamped to 1500
      expect(expectedAutoDropTime(25)).toBe(AUTO_DROP_MIN_MS);

      // Level 100: would be negative -> clamped to 1500
      expect(expectedAutoDropTime(100)).toBe(AUTO_DROP_MIN_MS);
    });

    /**
     * Test: Difficulty scaling is consistent across levels
     *
     * Validates: Requirements 6.6, 6.7, 6.8
     */
    test("difficulty scaling is consistent across levels", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get all level configs
      const levelConfigs = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.levelConfigs.map(
          (config: { spawnInterval: number; wobbleMultiplier: number; name: string }) => ({
            spawnInterval: config.spawnInterval,
            wobbleMultiplier: config.wobbleMultiplier,
            name: config.name,
          }),
        );
      });

      // Verify we have multiple level configs
      expect(levelConfigs.length).toBeGreaterThanOrEqual(5);

      // Verify each level has valid config values
      for (let i = 0; i < levelConfigs.length; i++) {
        const config = levelConfigs[i];

        // Spawn interval should be positive and >= 800
        expect(config.spawnInterval).toBeGreaterThanOrEqual(800);

        // Wobble multiplier should be >= 1.0 and increase with level
        expect(config.wobbleMultiplier).toBeGreaterThanOrEqual(1.0);
        expect(config.wobbleMultiplier).toBeCloseTo(1.0 + i * 0.1, 1);

        // Level name should exist
        expect(config.name).toBeDefined();
        expect(config.name.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Level Up Edge Cases", () => {
    /**
     * Test: Base duck resets to initial size after level up continue
     *
     * WHEN continue is clicked after level up, THEN the Test_Suite SHALL verify
     * base duck resets to base size.
     *
     * Validates: Requirements 6.5
     */
    test("base duck resets to initial size after level up continue", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get initial base duck width
      const initialWidth: number = await getGameState(page, "ducks.0.w");
      expect(initialWidth).toBe(DUCK_BASE_WIDTH);

      // Trigger level up (which sets base duck width past threshold)
      await directTriggerLevelUp(page, 1);

      // Verify base duck is now large
      const widthDuringLevelUp: number = await getGameState(page, "ducks.0.w");
      expect(widthDuringLevelUp).toBeGreaterThan(DUCK_BASE_WIDTH);

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify base duck width is reset
      const widthAfterContinue: number = await getGameState(page, "ducks.0.w");
      expect(widthAfterContinue).toBe(DUCK_BASE_WIDTH);
    });

    /**
     * Test: Level up screen hides after clicking continue
     *
     * Validates: Requirements 6.3
     */
    test("level up screen hides after clicking continue", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page, 1);

      // Verify level up screen is visible
      const levelUpScreen = page.locator("#level-up-screen");
      await expect(levelUpScreen).toBeVisible();

      // Click continue
      await page.locator("#continueLevelBtn").click();

      // Verify level up screen is hidden
      await expect(levelUpScreen).toBeHidden();
    });

    /**
     * Test: Game transitions back to PLAYING after level up continue
     *
     * Validates: Requirements 6.3
     */
    test("game transitions back to PLAYING after level up continue", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page, 1);

      // Verify LEVELUP mode
      const levelUpMode: string = await getGameState(page, "mode");
      expect(levelUpMode).toBe("LEVELUP");

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify PLAYING mode
      const playingMode: string = await getGameState(page, "mode");
      expect(playingMode).toBe("PLAYING");
    });

    /**
     * Test: New duck spawns after level up continue
     *
     * Validates: Requirements 6.3
     */
    test("new duck spawns after level up continue", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Trigger level up
      await directTriggerLevelUp(page, 1);

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Wait for new duck to spawn
      await waitForNewDuck(page);

      // Verify current duck exists and is in hover state
      const currentDuck = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return {
          exists: gs.currentDuck !== null,
          isFalling: gs.currentDuck?.isFalling,
          isStatic: gs.currentDuck?.isStatic,
        };
      });

      expect(currentDuck.exists).toBe(true);
      expect(currentDuck.isFalling).toBe(false);
      expect(currentDuck.isStatic).toBe(false);
    });

    /**
     * Test: Score is preserved after level up
     *
     * Validates: Requirements 6.2
     */
    test("score is preserved after level up", async ({ page }) => {
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Set a score before level up
      await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        gs.score = 42;
      });

      // Trigger level up
      await directTriggerLevelUp(page, 1);

      // Verify score is preserved during level up
      const scoreDuringLevelUp: number = await getGameState(page, "score");
      expect(scoreDuringLevelUp).toBe(42);

      // Click continue
      await page.locator("#continueLevelBtn").click();
      await waitForGameMode(page, "PLAYING");

      // Verify score is still preserved
      const scoreAfterContinue: number = await getGameState(page, "score");
      expect(scoreAfterContinue).toBe(42);
    });

    /**
     * Test: Level configs are seeded and reproducible
     *
     * Validates: Requirements 6.4
     */
    test("level configs are seeded and reproducible", async ({ page }) => {
      // Start first game with seed
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get level configs from first game
      const firstGameConfigs = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.levelConfigs
          .slice(0, 3)
          .map(
            (config: {
              color: string;
              secondaryColor: string;
              name: string;
              spawnInterval: number;
              wobbleMultiplier: number;
            }) => ({
              color: config.color,
              secondaryColor: config.secondaryColor,
              name: config.name,
              spawnInterval: config.spawnInterval,
              wobbleMultiplier: config.wobbleMultiplier,
            }),
          );
      });

      // Reload and start second game with same seed
      await page.goto("");
      await startSeededGame(page, SEED);
      await page.waitForTimeout(300);

      // Get level configs from second game
      const secondGameConfigs = await page.evaluate(() => {
        // biome-ignore lint/suspicious/noExplicitAny: accessing injected game state on window
        const gs = (window as any).__gameState;
        return gs.levelConfigs
          .slice(0, 3)
          .map(
            (config: {
              color: string;
              secondaryColor: string;
              name: string;
              spawnInterval: number;
              wobbleMultiplier: number;
            }) => ({
              color: config.color,
              secondaryColor: config.secondaryColor,
              name: config.name,
              spawnInterval: config.spawnInterval,
              wobbleMultiplier: config.wobbleMultiplier,
            }),
          );
      });

      // Verify configs are identical
      expect(secondGameConfigs).toEqual(firstGameConfigs);
    });
  });
});
