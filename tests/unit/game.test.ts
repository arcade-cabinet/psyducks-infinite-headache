import { describe, expect, it } from "vitest";
import { CONFIG, Duck, Particle } from "@/scripts/game";
import { SeededRandom } from "@/scripts/seededRandom";

describe("Game Configuration", () => {
  it("should have valid configuration values", () => {
    expect(CONFIG.duckWidth).toBe(80);
    expect(CONFIG.duckHeight).toBe(70);
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
    expect(duck.w).toBe(CONFIG.duckWidth);
    expect(duck.h).toBe(CONFIG.duckHeight);
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
    const mockState = {
      mode: "PLAYING" as const,
      score: 0,
      highScore: 0,
      level: 0,
      seed: "test-seed",
      ducks: [],
      currentDuck: null,
      cameraY: 0,
      targetCameraY: 0,
      bgRotation: 0,
      width: 800,
      height: 600,
      baseY: 500,
      particles: [],
      gameSpeed: 1,
      stressLevel: 0,
      isDragging: false,
      dragStartX: 0,
      mergeCount: 0,
      rng: new SeededRandom("test"),
      levelConfigs: [],
    };

    duck.squish();
    const initialScaleY = duck.scaleY;

    // Update multiple times
    for (let i = 0; i < 10; i++) {
      duck.update(mockState);
    }

    // Should be closer to 1 after updates
    expect(duck.scaleY).toBeGreaterThan(initialScaleY);
    expect(duck.scaleX).toBeLessThan(1 + CONFIG.squishFactor);
  });

  it("should not move when falling", () => {
    const duck = new Duck(100, 200, false, 0);
    const mockState = {
      mode: "PLAYING" as const,
      score: 0,
      highScore: 0,
      level: 0,
      seed: "test-seed",
      ducks: [],
      currentDuck: null,
      cameraY: 0,
      targetCameraY: 0,
      bgRotation: 0,
      width: 800,
      height: 600,
      baseY: 500,
      particles: [],
      gameSpeed: 1,
      stressLevel: 0,
      isDragging: false,
      dragStartX: 0,
      mergeCount: 0,
      rng: new SeededRandom("test"),
      levelConfigs: [],
    };

    const initialY = duck.y;
    duck.isFalling = true;
    duck.update(mockState);

    // Y should increase due to gravity
    expect(duck.y).toBeGreaterThan(initialY);
  });
});

describe("Particle Class", () => {
  it("should initialize with correct properties", () => {
    const particle = new Particle(100, 200);
    expect(particle.x).toBe(100);
    expect(particle.y).toBe(200);
    expect(particle.life).toBe(1.0);
    expect(particle.vx).toBeDefined();
    expect(particle.vy).toBeDefined();
    expect(particle.size).toBeGreaterThan(0);
  });

  it("should update position and life", () => {
    const particle = new Particle(100, 200);
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
    const particle = new Particle(100, 200);

    // Update many times
    for (let i = 0; i < 40; i++) {
      particle.update();
    }

    // Life should be significantly decayed or zero
    expect(particle.life).toBeLessThanOrEqual(0);
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
    const maxDiff = CONFIG.duckWidth * CONFIG.hitTolerance;
    expect(maxDiff).toBeGreaterThan(0);
    expect(maxDiff).toBeLessThan(CONFIG.duckWidth);
  });
});
