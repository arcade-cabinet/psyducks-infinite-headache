/**
 * Enhanced Animation System using anime.js v4
 */
import { animate, random, remove, stagger } from "animejs";

/**
 * Cancel all active anime.js animations on a target element
 */
export function cancelAnimations(element: HTMLElement) {
  remove(element);
}

/**
 * Animate perfect landing text popup
 */
export function animatePerfectText(element: HTMLElement) {
  animate(element, {
    translateY: [0, -50],
    scale: [0.5, 1.2, 1],
    opacity: [0, 1, 0],
    duration: 1000,
    ease: "outCubic",
  });
}

/**
 * Animate score increase with bounce
 */
export function animateScoreUpdate(element: HTMLElement) {
  animate(element, {
    scale: [1, 1.3, 1],
    duration: 300,
    ease: "outElastic(1, .5)",
  });
}

/**
 * Animate game over screen entrance
 */
export function animateGameOver(element: HTMLElement) {
  animate(element, {
    scale: [0, 1],
    opacity: [0, 1],
    duration: 500,
    ease: "outBack",
  });
}

/**
 * Animate start screen entrance
 */
export function animateStartScreen(element: HTMLElement) {
  animate(element, {
    scale: [0.8, 1],
    opacity: [0, 1],
    duration: 600,
    ease: "outElastic(1, .6)",
  });
}

/**
 * Animate button press
 */
export function animateButtonPress(element: HTMLElement) {
  return animate(element, {
    scale: [1, 0.95, 1],
    duration: 200,
    ease: "inOutQuad",
  });
}

/**
 * Animate duck squish on landing
 */
export function animateDuckSquish(element: HTMLElement) {
  animate(element, {
    scaleY: [1, 0.8, 1],
    scaleX: [1, 1.2, 1],
    duration: 400,
    ease: "outElastic(1, .8)",
  });
}

/**
 * Pulse animation for high score
 */
export function pulseHighScore(element: HTMLElement) {
  return animate(element, {
    scale: [1, 1.1, 1],
    duration: 800,
    loop: true,
    ease: "inOutQuad",
  });
}

/**
 * Shake animation for game over or near miss
 */
export function shakeElement(element: HTMLElement, intensity = 5) {
  animate(element, {
    translateX: [
      { value: intensity, duration: 50 },
      { value: -intensity, duration: 50 },
      { value: intensity / 2, duration: 50 },
      { value: -intensity / 2, duration: 50 },
      { value: 0, duration: 50 },
    ],
    ease: "inOutQuad",
  });
}

/**
 * Fade in element
 */
export function fadeIn(element: HTMLElement, duration = 300) {
  animate(element, {
    opacity: [0, 1],
    duration,
    ease: "linear",
  });
}

/**
 * Fade out element
 */
export function fadeOut(element: HTMLElement, duration = 300) {
  return animate(element, {
    opacity: [1, 0],
    duration,
    ease: "linear",
  }).then();
}

/**
 * Stagger animation for UI elements
 */
export function staggerFadeIn(elements: HTMLElement[], delay = 100) {
  animate(elements, {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 400,
    delay: stagger(delay),
    ease: "outQuad",
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

  animate(particles, {
    translateX: () => random(-100, 100),
    translateY: () => random(-100, 100),
    opacity: [1, 0],
    scale: [1, 0],
    duration: 1000,
    ease: "outQuad",
    onComplete: () => {
      for (const p of particles) {
        p.remove();
      }
    },
  });
}

/**
 * Animate duck merge - scale up with particle burst
 */
export function animateMerge(element: HTMLElement, callback?: () => void) {
  animate(element, {
    scale: [1, 1.5, 1.3],
    rotate: [0, 360],
    duration: 800,
    ease: "outElastic(1, .6)",
    onComplete: callback,
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
  animate(ducks, {
    opacity: [1, 0],
    scale: [1, 0.5],
    duration: 400,
    ease: "inQuad",
    onComplete: () => {
      animateMerge(targetDuck, callback);
    },
  });
}

/**
 * Wobble animation for unstable tower warning
 */
export function wobbleWarning(element: HTMLElement) {
  return animate(element, {
    rotate: ["-2deg", "2deg"],
    duration: 100,
    alternate: true,
    loop: true,
    ease: "inOutSine",
  });
}

/**
 * Shake for critically unstable tower
 */
export function criticalShake(element: HTMLElement) {
  animate(element, {
    translateX: [
      { value: 10, duration: 40 },
      { value: -10, duration: 40 },
      { value: 8, duration: 40 },
      { value: -8, duration: 40 },
      { value: 5, duration: 40 },
      { value: -5, duration: 40 },
      { value: 0, duration: 40 },
    ],
    ease: "inOutQuad",
  });
}

/**
 * Animate level up screen
 */
export function animateLevelUp(element: HTMLElement) {
  animate(element, {
    scale: [0, 1.2, 1],
    opacity: [0, 1],
    rotate: ["-10deg", "10deg", "0deg"],
    duration: 800,
    ease: "outElastic(1, .6)",
  });
}

/**
 * Continuous floating animation (for title)
 */
export function floatAnimation(element: HTMLElement) {
  return animate(element, {
    translateY: [-5, 5],
    rotate: [-1, 1],
    duration: 3000,
    loop: true,
    alternate: true,
    ease: "inOutSine",
  });
}
