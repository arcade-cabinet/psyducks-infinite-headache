/**
 * Device detection, haptics, and gyroscope utilities
 */

export type InputMethod = "touch" | "keyboard" | "both";

/**
 * Detect the primary input method of the current device
 */
export function detectInputMethod(): InputMethod {
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const hasKeyboard = !hasTouch || window.innerWidth > 1024;

  if (hasTouch && hasKeyboard) return "both";
  if (hasTouch) return "touch";
  return "keyboard";
}

/**
 * Get control hint text based on detected input method
 */
export function getControlHint(): string {
  const method = detectInputMethod();
  switch (method) {
    case "touch":
      return "Drag to position, tap to drop";
    case "keyboard":
      return "Arrow keys to move, Space to drop";
    case "both":
      return "Drag or arrow keys to move, tap/Space to drop";
  }
}

// --- Haptics ---

type HapticStyle = "light" | "medium" | "heavy";

let hapticsModule: typeof import("@capacitor/haptics") | null = null;

async function loadHaptics() {
  if (hapticsModule) return hapticsModule;
  try {
    hapticsModule = await import("@capacitor/haptics");
    return hapticsModule;
  } catch {
    return null;
  }
}

/**
 * Trigger haptic feedback (Capacitor native or no-op on web)
 */
export async function triggerHaptic(style: HapticStyle = "medium") {
  try {
    const mod = await loadHaptics();
    if (!mod) return;
    const { Haptics, ImpactStyle } = mod;
    const styleMap: Record<HapticStyle, (typeof ImpactStyle)[keyof typeof ImpactStyle]> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch {
    // Haptics not available — silently ignore
  }
}

// --- Gyroscope ---

export interface GyroState {
  active: boolean;
  tiltX: number; // -1 to 1 normalized tilt
}

const gyroState: GyroState = { active: false, tiltX: 0 };
let gyroCleanup: (() => void) | null = null;

/**
 * Initialize gyroscope tilt control
 * Default ON for touch devices, OFF for desktop
 */
export async function initGyroscope(): Promise<boolean> {
  const method = detectInputMethod();
  if (method === "keyboard") return false;

  // Try Capacitor Motion first
  try {
    const { Motion } = await import("@capacitor/motion");
    const watcher = await Motion.addListener("accel", (event) => {
      // event.accelerationIncludingGravity.x gives tilt
      const x = event.accelerationIncludingGravity?.x ?? 0;
      // Normalize: typical range is -10 to 10
      gyroState.tiltX = Math.max(-1, Math.min(1, x / 10));
      gyroState.active = true;
    });
    gyroCleanup = () => watcher.remove();
    return true;
  } catch {
    // Capacitor not available — try DeviceMotionEvent fallback
  }

  // Web DeviceMotionEvent fallback
  if ("DeviceMotionEvent" in window) {
    // iOS 13+ requires permission
    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === "function") {
      try {
        const perm = await dme.requestPermission();
        if (perm !== "granted") return false;
      } catch {
        return false;
      }
    }

    const handler = (e: DeviceMotionEvent) => {
      const x = e.accelerationIncludingGravity?.x ?? 0;
      gyroState.tiltX = Math.max(-1, Math.min(1, x / 10));
      gyroState.active = true;
    };
    window.addEventListener("devicemotion", handler);
    gyroCleanup = () => window.removeEventListener("devicemotion", handler);
    return true;
  }

  return false;
}

/**
 * Get current gyroscope tilt state
 */
export function getGyroState(): GyroState {
  return gyroState;
}

/**
 * Stop gyroscope tracking
 */
export function stopGyroscope() {
  gyroCleanup?.();
  gyroCleanup = null;
  gyroState.active = false;
  gyroState.tiltX = 0;
}
