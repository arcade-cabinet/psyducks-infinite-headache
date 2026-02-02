/**
 * Enhanced Animation System using anime.js
 */
import * as animeModule from "animejs";

// anime.js v4 exports differently - access the default function
const anime = (animeModule as any).default || animeModule;

/**
 * Animate perfect landing text popup
 */
export function animatePerfectText(element: HTMLElement) {
  anime({
    targets: element,
    translateY: [0, -50],
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 0],
    duration: 1000,
    easing: "easeOutCubic",
  });
}

/**
 * Animate score increase with bounce
 */
export function animateScoreUpdate(element: HTMLElement) {
  anime({
    targets: element,
    scale: [1, 1.3, 1],
    duration: 300,
    easing: "easeOutElastic(1, .5)",
  });
}

/**
 * Animate game over screen entrance
 */
export function animateGameOver(element: HTMLElement) {
  anime({
    targets: element,
    scale: [0, 1],
    opacity: [0, 1],
    duration: 500,
    easing: "easeOutBack",
  });
}

/**
 * Animate start screen entrance
 */
export function animateStartScreen(element: HTMLElement) {
  anime({
    targets: element,
    scale: [0.8, 1],
    opacity: [0, 1],
    duration: 600,
    easing: "easeOutElastic(1, .6)",
  });
}

/**
 * Animate button press
 */
export function animateButtonPress(element: HTMLElement) {
  return anime({
    targets: element,
    scale: [1, 0.95, 1],
    duration: 200,
    easing: "easeInOutQuad",
  });
}

/**
 * Animate duck squish on landing
 */
export function animateDuckSquish(element: HTMLElement) {
  anime({
    targets: element,
    scaleY: [1, 0.8, 1],
    scaleX: [1, 1.2, 1],
    duration: 400,
    easing: "easeOutElastic(1, .8)",
  });
}

/**
 * Pulse animation for high score
 */
export function pulseHighScore(element: HTMLElement) {
  anime({
    targets: element,
    scale: [1, 1.1, 1],
    duration: 800,
    loop: true,
    easing: "easeInOutQuad",
  });
}

/**
 * Shake animation for game over or near miss
 */
export function shakeElement(element: HTMLElement, intensity = 5) {
  anime({
    targets: element,
    translateX: [
      { value: intensity, duration: 50 },
      { value: -intensity, duration: 50 },
      { value: intensity / 2, duration: 50 },
      { value: -intensity / 2, duration: 50 },
      { value: 0, duration: 50 },
    ],
    easing: "easeInOutQuad",
  });
}

/**
 * Fade in element
 */
export function fadeIn(element: HTMLElement, duration = 300) {
  anime({
    targets: element,
    opacity: [0, 1],
    duration,
    easing: "linear",
  });
}

/**
 * Fade out element
 */
export function fadeOut(element: HTMLElement, duration = 300) {
  return anime({
    targets: element,
    opacity: [1, 0],
    duration,
    easing: "linear",
  }).finished;
}

/**
 * Stagger animation for UI elements
 */
export function staggerFadeIn(elements: HTMLElement[], delay = 100) {
  anime({
    targets: elements,
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 400,
    delay: anime.stagger(delay),
    easing: "easeOutQuad",
  });
}

/**
 * Create particle burst animation
 */
export function createParticleBurst(container: HTMLElement, x: number, y: number, count = 20) {
  const particles: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = "8px";
    particle.style.height = "8px";
    particle.style.borderRadius = "50%";
    particle.style.backgroundColor = i % 2 === 0 ? "#FDD835" : "#FFF";
    particle.style.pointerEvents = "none";
    particle.style.zIndex = "100";
    container.appendChild(particle);
    particles.push(particle);
  }

  anime({
    targets: particles,
    translateX: () => anime.random(-100, 100),
    translateY: () => anime.random(-100, 100),
    opacity: [1, 0],
    scale: [1, 0],
    duration: 1000,
    easing: "easeOutQuad",
    complete: () => {
      particles.forEach((p) => p.remove());
    },
  });
}

/**
 * Animate duck merge - scale up with particle burst
 */
export function animateMerge(element: HTMLElement, callback?: () => void) {
  anime({
    targets: element,
    scale: [1, 1.5, 1.3],
    rotate: [0, 360],
    duration: 800,
    easing: "easeOutElastic(1, .6)",
    complete: callback,
  });
}

/**
 * Animate ducks merging together
 */
export function animateDucksMerging(
  ducks: HTMLElement[],
  targetDuck: HTMLElement,
  callback?: () => void,
) {
  // Animate all ducks moving to target
  anime({
    targets: ducks,
    opacity: [1, 0],
    scale: [1, 0.5],
    duration: 400,
    easing: "easeInQuad",
    complete: () => {
      // Then animate target growing
      animateMerge(targetDuck, callback);
    },
  });
}

/**
 * Wobble animation for unstable tower warning
 */
export function wobbleWarning(element: HTMLElement) {
  return anime({
    targets: element,
    rotate: ["-2deg", "2deg"],
    duration: 100,
    direction: "alternate",
    loop: true,
    easing: "easeInOutSine",
  });
}

/**
 * Shake for critically unstable tower
 */
export function criticalShake(element: HTMLElement) {
  anime({
    targets: element,
    translateX: [
      { value: 10, duration: 40 },
      { value: -10, duration: 40 },
      { value: 8, duration: 40 },
      { value: -8, duration: 40 },
      { value: 5, duration: 40 },
      { value: -5, duration: 40 },
      { value: 0, duration: 40 },
    ],
    easing: "easeInOutQuad",
  });
}

/**
 * Continuous floating animation (for title)
 */
export function floatAnimation(element: HTMLElement) {
  return anime({
    targets: element,
    translateY: [-5, 5],
    rotate: [-1, 1],
    duration: 3000,
    loop: true,
    direction: "alternate",
    easing: "easeInOutSine",
  });
}
