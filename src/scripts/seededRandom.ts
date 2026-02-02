/**
 * Seed-based Random Number Generator System
 * Provides deterministic randomness for reproducible gameplay
 */
import seedrandom from "seedrandom";

// Word pools for level name generation
const ADJECTIVES = [
  "Cosmic",
  "Electric",
  "Mystic",
  "Radiant",
  "Twilight",
  "Crystal",
  "Frozen",
  "Blazing",
  "Shadow",
  "Golden",
  "Silver",
  "Neon",
  "Quantum",
  "Stellar",
  "Oceanic",
  "Desert",
  "Forest",
  "Mountain",
  "Celestial",
  "Ancient",
  "Modern",
  "Prismatic",
  "Luminous",
  "Ethereal",
  "Volcanic",
  "Glacial",
  "Thunder",
  "Harmonic",
  "Plasma",
  "Nebula",
  "Aurora",
  "Sonic",
  "Cyber",
  "Pixel",
  "Vector",
  "Digital",
  "Analog",
  "Retro",
  "Future",
  "Hyper",
];

const NOUNS = [
  "Psyduck",
  "Tower",
  "Dimension",
  "Realm",
  "Paradise",
  "Palace",
  "Sanctuary",
  "Citadel",
  "Fortress",
  "Haven",
  "Domain",
  "Kingdom",
  "Empire",
  "Nexus",
  "Portal",
  "Gateway",
  "Horizon",
  "Oasis",
  "Valley",
  "Peak",
  "Cascade",
  "Vortex",
  "Matrix",
  "Core",
  "Zone",
  "Sector",
  "Arena",
  "Stadium",
  "Garden",
  "Labyrinth",
  "Maze",
  "Chamber",
  "Vault",
  "Archive",
  "Library",
  "Temple",
  "Shrine",
  "Monument",
  "Spire",
  "Pinnacle",
];

export class SeededRandom {
  private rng: seedrandom.PRNG;
  public seed: string;

  constructor(seed?: string) {
    this.seed = seed || this.generateRandomSeed();
    this.rng = seedrandom(this.seed);
  }

  /**
   * Generate a random seed phrase (3 words)
   */
  private generateRandomSeed(): string {
    const words = [];

    // Use Math.random for initial seed generation only
    words.push(ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]);
    words.push(ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]);
    words.push(NOUNS[Math.floor(Math.random() * NOUNS.length)]);

    return words.join("-").toLowerCase();
  }

  /**
   * Get next random number [0, 1)
   */
  next(): number {
    return this.rng();
  }

  /**
   * Get random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Get random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Choose random element from array
   */
  choose<T>(array: T[]): T {
    if (array.length === 0) {
      throw new RangeError("choose() called with empty array");
    }
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Reset RNG with new seed
   */
  reset(seed?: string) {
    this.seed = seed || this.generateRandomSeed();
    this.rng = seedrandom(this.seed);
  }

  /**
   * Generate level name: adjective-adjective-noun
   */
  generateLevelName(): string {
    const adj1 = this.choose(ADJECTIVES);
    const adj2 = this.choose(ADJECTIVES.filter((a) => a !== adj1));
    const noun = this.choose(NOUNS);
    return `${adj1} ${adj2} ${noun}`;
  }

  /**
   * Generate color from seed (HSL)
   */
  generateColor(saturation = 70, lightness = 60): string {
    const hue = this.nextInt(0, 360);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Generate complementary color pair
   */
  generateColorPair(): { primary: string; secondary: string } {
    const hue = this.nextInt(0, 360);
    const saturation = this.nextInt(60, 90);
    const lightness = this.nextInt(50, 70);

    return {
      primary: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      secondary: `hsl(${hue}, ${Math.max(20, saturation - 30)}%, ${Math.min(90, lightness + 20)}%)`,
    };
  }

  /**
   * Convert HSL to Hex
   */
  hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Generate hex color
   */
  generateHexColor(): string {
    const h = this.nextInt(0, 360);
    const s = this.nextInt(60, 90);
    const l = this.nextInt(50, 70);
    return this.hslToHex(h, s, l);
  }
}

/**
 * Validate and sanitize seed input
 */
export function sanitizeSeed(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 100);
}

/**
 * Parse seed to extract components if formatted as adjective-adjective-noun
 */
export function parseSeed(seed: string): {
  isValid: boolean;
  adjective1?: string;
  adjective2?: string;
  noun?: string;
} {
  const parts = seed.split("-");

  if (parts.length === 3) {
    return {
      isValid: true,
      adjective1: parts[0],
      adjective2: parts[1],
      noun: parts[2],
    };
  }

  return { isValid: false };
}

/**
 * Generate a shareable seed code
 */
export function generateShareableCode(seed: string, level: number, score: number): string {
  return btoa(`${seed}:${level}:${score}`);
}

/**
 * Parse shareable code
 */
export function parseShareableCode(code: string): {
  seed: string;
  level: number;
  score: number;
} | null {
  try {
    const decoded = atob(code);
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return null;
    }

    const [seed, levelStr, scoreStr] = parts;
    const level = Number.parseInt(levelStr, 10);
    const score = Number.parseInt(scoreStr, 10);

    // Validate parsed numbers
    if (
      Number.isNaN(level) ||
      Number.isNaN(score) ||
      !Number.isInteger(level) ||
      !Number.isInteger(score)
    ) {
      return null;
    }

    return { seed, level, score };
  } catch {
    return null;
  }
}
