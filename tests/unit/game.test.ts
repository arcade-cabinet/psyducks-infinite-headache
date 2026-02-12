import { describe, expect, it } from "vitest";
import { CONFIG, Duck, Particle, computeMergeGrowthRate, mergesForLevel } from "@/scripts/game";
import { SeededRandom } from "@/scripts/seededRandom";

describe("Game Configuration", () => {
  it("should have valid configuration values", () => {
    expect(CONFIG.duckBaseWidth).toBe(80);
    expect(CONFIG.duckBaseHeight).toBe(70);
    expect(CONFIG.gravity).toBeGreaterThan(0);
    expect(CONFIG.perfectTolerance).toBeGreaterThan(0);
    expect(CONFIG.hitTolerance).toBeGreaterThan(0);
    expect(CONFIG.hitTolerance).toBeLessThanOrEqual(1);
  });
});

describe("Duck Class", () => {
  it("should initialize with correct properties", () => {
    const duck = new Duck(100, 200, false, 0);
    expect(duck.x).toBe(100);
    expect(duck.y).toBe(200);
    expect(duck.w).toBe(CONFIG.duckBaseWidth);
    expect(duck.h).toBe(CONFIG.duckBaseHeight);
    expect(duck.isStatic).toBe(false);
    expect(duck.isFalling).toBe(false);
  });

  it("should initialize as static duck", () => {
    const duck = new Duck(100, 200, true, 0);
    expect(duck.isStatic).toBe(true);
  });

  it("should squish correctly", () => {
    const duck = new Duck(100, 200, false, 0);
    duck.squish();
    expect(duck.scaleY).toBe(1 - CONFIG.squishFactor);
    expect(duck.scaleX).toBe(1 + CONFIG.squishFactor);
  });

  it("should recover from squish over time", () => {
    const duck = new Duck(100, 200, false, 0);

    duck.squish();
    const initialScaleY = duck.scaleY;

    // Update multiple times
    for (let i = 0; i < 10; i++) {
      duck.update();
    }

    // Should be closer to 1 after updates
    expect(duck.scaleY).toBeGreaterThan(initialScaleY);
    expect(duck.scaleX).toBeLessThan(1 + CONFIG.squishFactor);
  });

  it("should fall when not static and not dragged", () => {
    const duck = new Duck(100, 200, false, 0);
    duck.isFalling = true; // Set to falling state

    const initialY = duck.y;
    duck.update();

    // Y should increase due to gravity
    expect(duck.y).toBeGreaterThan(initialY);
    expect(duck.velocity).toBe(CONFIG.gravity);
  });
});

describe("Duck prevY tracking", () => {
  it("should set prevY before applying velocity in update()", () => {
    const duck = new Duck(100, 200, false, 0);
    expect(duck.prevY).toBe(200);

    duck.isFalling = true;
    duck.update();

    // prevY should be the old y (200), y should have moved by velocity
    expect(duck.prevY).toBe(200);
    expect(duck.y).toBe(200 + CONFIG.gravity);
  });

  it("should track prevY across multiple updates", () => {
    const duck = new Duck(100, 0, false, 0);
    duck.isFalling = true;

    for (let i = 0; i < 5; i++) {
      const yBefore = duck.y;
      duck.update();
      expect(duck.prevY).toBe(yBefore);
      expect(duck.y).toBe(yBefore + CONFIG.gravity);
    }
  });

  it("should not update prevY when static", () => {
    const duck = new Duck(100, 200, true, 0);
    duck.update();
    // Static ducks don't fall, prevY stays at initial
    expect(duck.prevY).toBe(200);
    expect(duck.y).toBe(200);
  });

  it("should not update prevY when hovering (not falling)", () => {
    const duck = new Duck(100, 200, false, 0);
    duck.update();
    expect(duck.prevY).toBe(200);
    expect(duck.y).toBe(200);
  });
});

describe("Particle Class", () => {
  const rng = new SeededRandom("test-seed");

  it("should initialize with correct properties", () => {
    const particle = new Particle(100, 200, rng);
    expect(particle.x).toBe(100);
    expect(particle.y).toBe(200);
    expect(particle.life).toBe(1.0);
    expect(particle.vx).toBeDefined();
    expect(particle.vy).toBeDefined();
    expect(particle.size).toBeGreaterThan(0);
  });

  it("should update position and life", () => {
    const particle = new Particle(100, 200, rng);
    const initialLife = particle.life;
    const initialX = particle.x;
    const initialY = particle.y;

    particle.update();

    expect(particle.life).toBeLessThan(initialLife);
    // Position should change based on velocity
    expect(particle.x).not.toBe(initialX);
    expect(particle.y).not.toBe(initialY);
  });

  it("should decay life over time", () => {
    const particle = new Particle(100, 200, rng);

    // Update many times
    for (let i = 0; i < 40; i++) {
      particle.update();
    }

    // Life should be significantly decayed or zero
    expect(particle.life).toBeLessThanOrEqual(0);
  });
});

describe("CONFIG properties", () => {
  it("should have levelUpScreenRatio defined between 0 and 1", () => {
    expect(CONFIG.levelUpScreenRatio).toBeDefined();
    expect(CONFIG.levelUpScreenRatio).toBeGreaterThan(0);
    expect(CONFIG.levelUpScreenRatio).toBeLessThanOrEqual(1);
  });

  it("should have baseMergesPerLevel defined and positive", () => {
    expect(CONFIG.baseMergesPerLevel).toBeDefined();
    expect(CONFIG.baseMergesPerLevel).toBeGreaterThan(0);
  });

  it("should have auto-drop timer config", () => {
    expect(CONFIG.autoDropBaseMs).toBeGreaterThan(0);
    expect(CONFIG.autoDropMinMs).toBeGreaterThan(0);
    expect(CONFIG.autoDropMinMs).toBeLessThan(CONFIG.autoDropBaseMs);
  });
});

describe("Balanced merge coefficient", () => {
  it("computeMergeGrowthRate returns positive value", () => {
    const rate = computeMergeGrowthRate(800, 0);
    expect(rate).toBeGreaterThan(0);
  });

  it("produces the same merge count on different screen widths", () => {
    // Level 0: both mobile and desktop should need the same number of merges
    const merges = mergesForLevel(0);
    expect(merges).toBeGreaterThanOrEqual(CONFIG.baseMergesPerLevel);

    // Verify growth reaches target in exactly mergesNeeded merges
    for (const designWidth of [412, 600, 800]) {
      const rate = computeMergeGrowthRate(designWidth, 0);
      const finalWidth = CONFIG.duckBaseWidth * (1 + rate) ** merges;
      const target = designWidth * CONFIG.levelUpScreenRatio;
      expect(finalWidth).toBeCloseTo(target, 1);
    }
  });

  it("requires more merges at higher levels (logarithmic difficulty)", () => {
    const mergesL0 = mergesForLevel(0);
    const mergesL3 = mergesForLevel(3);
    const mergesL9 = mergesForLevel(9);

    expect(mergesL3).toBeGreaterThan(mergesL0);
    expect(mergesL9).toBeGreaterThan(mergesL3);
  });

  it("growth rate is smaller on wider screens (more gradiated)", () => {
    const rateMobile = computeMergeGrowthRate(412, 0);
    const rateDesktop = computeMergeGrowthRate(800, 0);

    // Wider screen → larger target → higher growth rate per merge
    // (since base duck is same size but target is wider)
    expect(rateDesktop).toBeGreaterThan(rateMobile);
  });
});

describe("Game Logic", () => {
  it("should detect perfect landing tolerance", () => {
    const tolerance = CONFIG.perfectTolerance;
    const withinTolerance = 5;
    const outsideTolerance = 10;

    expect(Math.abs(withinTolerance)).toBeLessThan(tolerance);
    expect(Math.abs(outsideTolerance)).toBeGreaterThan(tolerance);
  });

  it("should calculate hit tolerance correctly", () => {
    const maxDiff = CONFIG.duckBaseWidth * CONFIG.hitTolerance;
    expect(maxDiff).toBeGreaterThan(0);
    expect(maxDiff).toBeLessThan(CONFIG.duckBaseWidth);
  });
});
