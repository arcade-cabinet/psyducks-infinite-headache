import { describe, expect, it } from "vitest";
import { CONFIG, Duck, Particle } from "@/scripts/game";
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

    const initialY = duck.y;
    duck.update();

    // Y should increase due to gravity
    expect(duck.y).toBeGreaterThan(initialY);
    expect(duck.velocity).toBe(CONFIG.gravity);
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

describe("Duck prevY tracking", () => {
  it("should set prevY before applying velocity in update()", () => {
    const duck = new Duck(100, 200, false, 0);
    expect(duck.prevY).toBe(200);

    duck.update();

    // prevY should be the old y (200), y should have moved by velocity
    expect(duck.prevY).toBe(200);
    expect(duck.y).toBe(200 + CONFIG.gravity);
  });

  it("should track prevY across multiple updates", () => {
    const duck = new Duck(100, 0, false, 0);

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
});

describe("CONFIG properties", () => {
  it("should have mergeGrowthRate defined and positive", () => {
    expect(CONFIG.mergeGrowthRate).toBeDefined();
    expect(CONFIG.mergeGrowthRate).toBeGreaterThan(0);
  });

  it("should have levelUpWidthRatio defined between 0 and 1", () => {
    expect(CONFIG.levelUpWidthRatio).toBeDefined();
    expect(CONFIG.levelUpWidthRatio).toBeGreaterThan(0);
    expect(CONFIG.levelUpWidthRatio).toBeLessThanOrEqual(1);
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
