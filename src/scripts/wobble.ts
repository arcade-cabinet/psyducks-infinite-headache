/**
 * Wobble Physics System
 * Simulates tower instability and wobbling based on stack height and balance
 */

export interface WobbleState {
  angle: number;
  angularVelocity: number;
  angularAcceleration: number;
  stability: number; // 0-1, where 1 is perfectly stable
}

export class WobblePhysics {
  angle: number;
  angularVelocity: number;
  maxAngle: number;
  damping: number;
  restoring: number;
  instability: number;
  centerOfMassOffset: number;

  constructor() {
    this.angle = 0;
    this.angularVelocity = 0;
    this.maxAngle = Math.PI / 6; // 30 degrees max
    this.damping = 0.95; // Energy loss
    this.restoring = 0.02; // Spring force back to center
    this.instability = 0; // How unstable the tower is
    this.centerOfMassOffset = 0; // Horizontal offset of center of mass
  }

  /**
   * Update wobble physics
   */
  update(stackHeight: number, imbalance: number, mergeLevel: number) {
    // Calculate instability based on height and imbalance
    this.instability = Math.min(1, stackHeight * 0.1 + imbalance * 2);

    // Larger ducks are more stable
    const sizeStability = 1 / (1 + mergeLevel * 0.5);
    this.instability *= sizeStability;

    // Add random perturbations (wind, headache shakes)
    const randomForce = (Math.random() - 0.5) * this.instability * 0.01;

    // Restoring force (tries to bring tower back to upright)
    const restoringForce = -this.angle * this.restoring * (1 - this.instability);

    // Center of mass offset creates additional force
    const massForce = this.centerOfMassOffset * 0.001 * this.instability;

    // Update angular acceleration
    const angularAcceleration = restoringForce + randomForce + massForce;

    // Update velocity and position
    this.angularVelocity += angularAcceleration;
    this.angularVelocity *= this.damping; // Apply damping
    this.angle += this.angularVelocity;

    // Clamp angle
    this.angle = Math.max(-this.maxAngle, Math.min(this.maxAngle, this.angle));

    // Check for collapse
    return Math.abs(this.angle) < this.maxAngle * 0.95;
  }

  /**
   * Add impulse to the wobble (when duck lands)
   */
  addImpulse(force: number) {
    this.angularVelocity += force * 0.1;
  }

  /**
   * Update center of mass based on duck positions
   */
  updateCenterOfMass(ducks: { x: number; w: number }[], centerX: number) {
    if (ducks.length === 0) return;

    let totalMass = 0;
    let weightedX = 0;

    for (const duck of ducks) {
      const mass = duck.w * duck.w; // Mass proportional to area
      totalMass += mass;
      weightedX += duck.x * mass;
    }

    const centerOfMassX = weightedX / totalMass;
    this.centerOfMassOffset = centerOfMassX - centerX;
  }

  /**
   * Get wobble state for rendering
   */
  getState(): WobbleState {
    const restoringForce = -this.angle * this.restoring * (1 - this.instability);
    const massForce = this.centerOfMassOffset * 0.001 * this.instability;
    const angularAcceleration = restoringForce + massForce;
    
    return {
      angle: this.angle,
      angularVelocity: this.angularVelocity,
      angularAcceleration,
      stability: 1 - this.instability,
    };
  }

  /**
   * Calculate position offset for a duck at given height
   */
  getOffsetAtHeight(height: number, baseY: number): { x: number; rotation: number } {
    const relativeHeight = baseY - height;
    const x = Math.sin(this.angle) * relativeHeight;
    return {
      x,
      rotation: this.angle,
    };
  }

  /**
   * Check if tower is critically unstable
   */
  isCriticallyUnstable(): boolean {
    return Math.abs(this.angle) > this.maxAngle * 0.9 || Math.abs(this.angularVelocity) > 0.3;
  }

  /**
   * Reset wobble physics
   */
  reset() {
    this.angle = 0;
    this.angularVelocity = 0;
    this.instability = 0;
    this.centerOfMassOffset = 0;
  }
}

const NORMALIZATION_FACTOR = 100;

/**
 * Calculate stack imbalance
 */
export function calculateImbalance(ducks: { x: number }[]): number {
  if (ducks.length < 2) return 0;

  let totalOffset = 0;
  for (let i = 1; i < ducks.length; i++) {
    const offset = Math.abs(ducks[i].x - ducks[i - 1].x);
    totalOffset += offset;
  }

  return totalOffset / (ducks.length - 1) / NORMALIZATION_FACTOR;
}

/**
 * Apply wobble to canvas context
 */
export function applyWobbleTransform(
  ctx: CanvasRenderingContext2D,
  wobble: WobblePhysics,
  baseX: number,
  baseY: number,
) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(wobble.angle);
  ctx.translate(-baseX, -baseY);
}

/**
 * Restore wobble transform
 */
export function restoreWobbleTransform(ctx: CanvasRenderingContext2D) {
  ctx.restore();
}
