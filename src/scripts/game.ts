/**
 * PSYDUCK INFINITE TOWER V2
 */

// Types
export interface GameState {
  mode: "MENU" | "PLAYING" | "GAMEOVER";
  score: number;
  highScore: number;
  ducks: Duck[];
  currentDuck: Duck | null;
  cameraY: number;
  targetCameraY: number;
  bgRotation: number;
  width: number;
  height: number;
  baseY: number;
  particles: Particle[];
  gameSpeed: number;
  stressLevel: number;
}

export interface Config {
  duckWidth: number;
  duckHeight: number;
  gravity: number;
  oscillateSpeed: number;
  perfectTolerance: number;
  hitTolerance: number;
  squishFactor: number;
}

// Configuration
export const CONFIG: Config = {
  duckWidth: 80,
  duckHeight: 70,
  gravity: 20,
  oscillateSpeed: 0.003,
  perfectTolerance: 8, // Pixels
  hitTolerance: 0.65, // Percentage overlap needed
  squishFactor: 0.2, // How much they squish on impact
};

// Audio System (Lazy Loaded)
let audioCtx: AudioContext | null = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

export function playSound(type: "drop" | "land" | "perfect" | "fail") {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === "drop") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === "land") {
    // Thud
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === "perfect") {
    // Magical Chime
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(800, now + 0.1);
    osc.frequency.setValueAtTime(1200, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);

    // Secondary harmonizing tone
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.linearRampToValueAtTime(600, now + 0.3);
    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.linearRampToValueAtTime(0, now + 0.3);
    osc2.start(now);
    osc2.stop(now + 0.3);
  } else if (type === "fail") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.8);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
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
  ctx.fillStyle = "#FDD835";
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arms (Holding Head)
  const armShake = isHeadache ? Math.random() * 2 : 0;
  ctx.fillStyle = "#FDD835";

  ctx.beginPath();
  ctx.ellipse(-w / 2.2 + armShake, -h / 4, w / 6, h / 4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(w / 2.2 - armShake, -h / 4, w / 6, h / 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head
  ctx.fillStyle = "#FDD835";
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
  ctx.fillStyle = "#FFE082";
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
  // Blink Logic
  const blink = Math.random() > 0.99;

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

    const shakeX = isHeadache ? (Math.random() - 0.5) * 3 : 0;
    const shakeY = isHeadache ? (Math.random() - 0.5) * 3 : 0;

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(-w / 5 + shakeX, -h / 2 + shakeY, pupilSize, 0, Math.PI * 2);
    ctx.arc(w / 5 + shakeX, -h / 2 + shakeY, pupilSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Psychic Waves
  if (isHeadache) {
    ctx.strokeStyle = `rgba(239, 83, 80, ${0.5 + Math.random() * 0.5})`;
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

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 10;
    this.vy = (Math.random() - 0.5) * 10;
    this.life = 1.0;
    this.color = Math.random() > 0.5 ? "#FFF" : "#FDD835";
    this.size = Math.random() * 5 + 2;
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
  time: number;
  speedBase: number;

  constructor(x: number, y: number, isStatic = false, score = 0) {
    this.x = x;
    this.y = y;
    this.w = CONFIG.duckWidth;
    this.h = CONFIG.duckHeight;
    this.isStatic = isStatic;
    this.isFalling = false;

    // Animation properties
    this.scaleY = 1;
    this.scaleX = 1;

    // Oscillation
    this.time = Math.random() * 100;
    // Higher score = Faster speed
    this.speedBase = 1.5 + Math.min(3, score * 0.15);
  }

  update(state: GameState) {
    // SQUISH recovery
    this.scaleX += (1 - this.scaleX) * 0.15;
    this.scaleY += (1 - this.scaleY) * 0.15;

    if (this.isStatic) return;

    if (this.isFalling) {
      this.y += CONFIG.gravity;
      return;
    }

    // Oscillation Logic
    this.time += CONFIG.oscillateSpeed * 16;
    const range = (state.width - this.w) / 2;

    // Add some chaotic movement at high scores
    const chaoticFactor = state.score > 10 ? Math.sin(this.time * 0.3) * 0.5 : 1;

    this.x = state.width / 2 + Math.sin(this.time * (this.speedBase * 0.05) * chaoticFactor) * range;
  }

  draw(ctx: CanvasRenderingContext2D, score: number) {
    const stress = Math.min(1, score / 20); // 0 to 1 based on score
    const isHeadache = !this.isStatic;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, this.scaleY);
    // We draw at 0,0 relative to translation
    drawPsyduck(ctx, 0, 0, this.w, this.h, stress, isHeadache);
    ctx.restore();
  }

  squish() {
    this.scaleY = 1 - CONFIG.squishFactor;
    this.scaleX = 1 + CONFIG.squishFactor;
  }
}
