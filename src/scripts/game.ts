/**
 * PSYDUCK INFINITE TOWER V3 - Drag & Merge Edition
 */
import type { SeededRandom } from "./seededRandom";

// Types
export interface GameState {
  mode: "MENU" | "PLAYING" | "GAMEOVER" | "LEVELUP";
  score: number;
  highScore: number;
  level: number;
  seed: string;
  ducks: Duck[];
  currentDuck: Duck | null;
  bgRotation: number;
  width: number;
  height: number;
  baseY: number;
  particles: Particle[];
  gameSpeed: number;
  stressLevel: number;
  isDragging: boolean;
  dragStartX: number;
  mergeCount: number;
  rng: SeededRandom;
  levelConfigs: LevelConfig[];
  cameraY: number;
  targetCameraY: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  dpr: number;
  gameOffsetX: number;
  autoDropTimer: number;
  autoDropTimeMax: number;
}

export interface LevelConfig {
  color: string;
  secondaryColor: string;
  name: string;
  spawnInterval: number;
  wobbleMultiplier: number;
}

/**
 * Generate level configs from seed
 */
export function generateLevelConfigs(seededRandom: SeededRandom, count = 10): LevelConfig[] {
  const configs: LevelConfig[] = [];

  for (let i = 0; i < count; i++) {
    const colors = seededRandom.generateColorPair();
    const baseInterval = 2000;
    // Gradually decrease spawn interval as levels progress (logarithmic curve for smooth difficulty)
    const intervalReduction = Math.log(i + 1) * 150;

    configs.push({
      color: colors.primary,
      secondaryColor: colors.secondary,
      name: seededRandom.generateLevelName(),
      spawnInterval: Math.max(800, baseInterval - intervalReduction),
      wobbleMultiplier: 1.0 + i * 0.1,
    });
  }

  return configs;
}

export interface Config {
  duckBaseWidth: number;
  duckBaseHeight: number;
  duckWidth: number;
  duckHeight: number;
  gravity: number;
  perfectTolerance: number;
  hitTolerance: number;
  squishFactor: number;
  mergeThreshold: number;
  spawnInterval: number;
  mergeGrowthRate: number;
  levelUpScreenRatio: number;
  baseMergesPerLevel: number;
  difficultyScale: number;
  autoDropBaseMs: number;
  autoDropMinMs: number;
}

// Configuration
export const CONFIG: Config = {
  duckBaseWidth: 80,
  duckBaseHeight: 70,
  duckWidth: 80,
  duckHeight: 70,
  gravity: 3, // Slower fall for dragging
  perfectTolerance: 8,
  hitTolerance: 0.65,
  squishFactor: 0.2,
  mergeThreshold: 5, // Merge after 5 stacks
  spawnInterval: 2000, // Spawn new duck every 2 seconds
  mergeGrowthRate: 0.5, // Base duck grows by 50% per merge
  levelUpScreenRatio: 0.85, // Level up when base duck fills 85% of screen width
  baseMergesPerLevel: 5,
  difficultyScale: 1,
  autoDropBaseMs: 3000,
  autoDropMinMs: 500,
};

/**
 * Compute the exponential merge growth rate for a given screen width and level.
 * Returns the per-merge growth factor so that `baseMergesPerLevel + log2(level+2)*difficultyScale`
 * merges will grow the base duck from CONFIG.duckBaseWidth to designWidth * levelUpScreenRatio.
 * This ensures the same number of merges per level on all screen sizes.
 */
export function computeMergeGrowthRate(designWidth: number, level: number): number {
  const baseWidth = CONFIG.duckBaseWidth;
  const targetWidth = designWidth * CONFIG.levelUpScreenRatio;
  const mergesNeeded =
    CONFIG.baseMergesPerLevel + Math.floor(Math.log2(level + 2) * CONFIG.difficultyScale);
  return (targetWidth / baseWidth) ** (1 / mergesNeeded) - 1;
}

/**
 * Compute the number of merges needed for a given level.
 */
export function mergesForLevel(level: number): number {
  return CONFIG.baseMergesPerLevel + Math.floor(Math.log2(level + 2) * CONFIG.difficultyScale);
}
// --- VISUALS ---

export function drawPsyduck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  stress: number,
  isHeadache: boolean,
  primaryColor = "#FDD835",
  secondaryColor = "#FFE082",
) {
  ctx.save();
  ctx.translate(x, y);

  const w = width;
  const h = height;

  // Shadows
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, h / 2 - 2, w / 2.2, h / 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.fillStyle = "#FFCCBC";
  ctx.strokeStyle = "#3E2723";
  ctx.lineWidth = 2;

  // Wiggle feet if headache
  const footOffset = isHeadache ? Math.sin(Date.now() / 50) * 2 : 0;

  ctx.beginPath();
  ctx.ellipse(-w / 4, h / 2 - 5 + footOffset, w / 6, h / 8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(w / 4, h / 2 - 5 - footOffset, w / 6, h / 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Body
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arms (Holding Head)
  const armShake = isHeadache ? Math.sin(Date.now() / 100) + 1 : 0;
  ctx.fillStyle = primaryColor;

  ctx.beginPath();
  ctx.ellipse(-w / 2.2 + armShake, -h / 4, w / 6, h / 4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(w / 2.2 - armShake, -h / 4, w / 6, h / 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.ellipse(0, -h / 3, w / 2.2, h / 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hairs
  ctx.beginPath();
  ctx.moveTo(0, -h / 1.2);
  ctx.lineTo(0, -h / 1.05);
  ctx.moveTo(-5, -h / 1.2);
  ctx.lineTo(-10, -h / 1.05);
  ctx.moveTo(5, -h / 1.2);
  ctx.lineTo(10, -h / 1.05);
  ctx.stroke();

  // Beak
  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.ellipse(0, -h / 4, w / 3, h / 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = "#3E2723";
  ctx.beginPath();
  ctx.arc(-5, -h / 3.5, 1, 0, Math.PI * 2);
  ctx.arc(5, -h / 3.5, 1, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#FFF";
  // Blink Logic (deterministic based on time, not randomized)
  const blink = Math.sin(Date.now() / 3000) > 0.98;

  if (blink && !isHeadache) {
    ctx.beginPath();
    ctx.moveTo(-w / 5 - 10, -h / 2);
    ctx.lineTo(-w / 5 + 10, -h / 2);
    ctx.moveTo(w / 5 - 10, -h / 2);
    ctx.lineTo(w / 5 + 10, -h / 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-w / 5, -h / 2, w / 7, h / 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(w / 5, -h / 2, w / 7, h / 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupils: Get smaller with stress
    let pupilSize = Math.max(0.5, 1.5 - stress * 1.5);
    if (isHeadache) pupilSize = 0.5;

    const shakeX = isHeadache ? Math.sin(Date.now() / 30) * 1.5 : 0;
    const shakeY = isHeadache ? Math.cos(Date.now() / 40) * 1.5 : 0;

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-w / 5 + shakeX, -h / 2 + shakeY, pupilSize, 0, Math.PI * 2);
    ctx.arc(w / 5 + shakeX, -h / 2 + shakeY, pupilSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Psychic Waves
  if (isHeadache) {
    const waveIntensity = 0.5 + (Math.sin(Date.now() / 200) + 1) * 0.25;
    ctx.strokeStyle = `rgba(239, 83, 80, ${waveIntensity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -h / 3, w, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -h / 3, w * 1.2, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
    ctx.stroke();
  }

  ctx.restore();
}

// --- CLASSES ---

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, rng: SeededRandom) {
    this.x = x;
    this.y = y;
    this.vx = (rng.next() - 0.5) * 10;
    this.vy = (rng.next() - 0.5) * 10;
    this.life = 1.0;
    this.color = rng.next() > 0.5 ? "#FFF" : "#FDD835";
    this.size = rng.next() * 5 + 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.03;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class Duck {
  x: number;
  y: number;
  w: number;
  h: number;
  isStatic: boolean;
  isFalling: boolean;
  scaleY: number;
  scaleX: number;
  mergeLevel: number; // 0 = base size, 1 = first merge, etc.
  stackCount: number; // How many ducks in this stack
  velocity: number; // Fall speed
  isBeingDragged: boolean;
  spawnX: number; // Random spawn position
  primaryColor: string;
  secondaryColor: string;
  prevY: number;

  constructor(
    x: number,
    y: number,
    isStatic = false,
    mergeLevel = 0,
    primaryColor = "#FDD835",
    secondaryColor = "#FFE082",
  ) {
    this.spawnX = x;
    this.x = x;
    this.y = y;
    this.prevY = y;
    this.mergeLevel = mergeLevel;
    this.primaryColor = primaryColor;
    this.secondaryColor = secondaryColor;
    // Size scales with merge level
    const sizeMultiplier = 1 + mergeLevel * CONFIG.mergeGrowthRate;
    this.w = CONFIG.duckBaseWidth * sizeMultiplier;
    this.h = CONFIG.duckBaseHeight * sizeMultiplier;
    this.isStatic = isStatic;
    this.isFalling = false;
    this.isBeingDragged = false;

    // Animation properties
    this.scaleY = 1;
    this.scaleX = 1;

    // Physics
    this.velocity = CONFIG.gravity;
    this.stackCount = 1;
  }

  update() {
    // SQUISH recovery
    this.scaleX += (1 - this.scaleX) * 0.15;
    this.scaleY += (1 - this.scaleY) * 0.15;

    if (this.isStatic) return;

    // Don't fall if being dragged
    if (this.isBeingDragged) {
      this.isFalling = false;
      return;
    }

    // Start or continue falling
    if (this.isFalling) {
      this.prevY = this.y;
      this.y += this.velocity;
    }
  }

  draw(ctx: CanvasRenderingContext2D, score: number) {
    const stress = Math.min(1, score / 20);
    const isHeadache = !this.isStatic;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, this.scaleY);
    drawPsyduck(
      ctx,
      0,
      0,
      this.w,
      this.h,
      stress,
      isHeadache,
      this.primaryColor,
      this.secondaryColor,
    );

    // Draw merge level indicator if merged
    if (this.mergeLevel > 0) {
      ctx.fillStyle = "#FFF";
      ctx.font = `bold ${Math.floor(this.h * 0.2)}px 'Fredoka One', cursive`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`★${this.mergeLevel + 1}`, 0, this.h * 0.3);
    }

    ctx.restore();
  }

  squish() {
    this.scaleY = 1 - CONFIG.squishFactor;
    this.scaleX = 1 + CONFIG.squishFactor;
  }

  // Check if point is inside duck's tummy (for dragging)
  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    // Check if point is in ellipse (tummy area)
    const rx = (this.w / 2) * this.scaleX;
    const ry = (this.h / 2) * this.scaleY; // Increased hit area
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }
}
