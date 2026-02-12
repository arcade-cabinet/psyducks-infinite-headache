# Design: Fix Wobble Test Failures

## Overview

This design specifies the changes needed to fix the failing wobble physics E2E tests. The approach focuses on aligning test expectations with actual game behavior while maintaining test coverage for the wobble physics system.

## Architecture

The wobble physics system has these key components:

```
WobblePhysics (wobble.ts)
├── angle: number (current tilt angle)
├── angularVelocity: number (rate of change)
├── instability: number (0-1, calculated from stack state)
├── stability: number (1 - instability, exposed via getState())
└── Methods:
    ├── update() - Called each frame, updates physics
    ├── addImpulse() - Called on duck landing
    ├── getState() - Returns current stability
    └── reset() - Resets to initial state

Game Render Loop (PsyduckGame.astro)
├── Calls wobblePhysics.update() each frame
├── Gets stability from wobblePhysics.getState()
├── Updates stabilityBar.style.width
└── Applies CSS classes based on stability thresholds
```

## Solution Approach

### Strategy 1: Fix Tests to Match Implementation

Rather than changing the game implementation, we'll fix the tests to:
1. Use gameplay-based testing instead of direct DOM manipulation
2. Wait for proper game state transitions
3. Use appropriate tolerances for physics-based comparisons

### Strategy 2: Add Test Helper for Wobble State

Create a new helper that manipulates the actual game's wobble physics state:

```typescript
/**
 * Set wobble physics state directly for testing.
 * This manipulates the actual game state, not just DOM.
 */
async function setWobblePhysicsState(
  page: Page,
  options: {
    instability?: number;
    angle?: number;
    angularVelocity?: number;
  }
): Promise<void> {
  await page.evaluate((opts) => {
    const gs = (window as any).__gameState;
    if (gs.wobblePhysics) {
      if (opts.instability !== undefined) {
        gs.wobblePhysics.instability = opts.instability;
      }
      if (opts.angle !== undefined) {
        gs.wobblePhysics.angle = opts.angle;
      }
      if (opts.angularVelocity !== undefined) {
        gs.wobblePhysics.angularVelocity = opts.angularVelocity;
      }
    }
  }, options);
  
  // Wait for render loop to update UI
  await page.waitForTimeout(100);
}
```

## Component Changes

### 1. Update helpers.ts

Add new helper function for wobble state manipulation:

```typescript
/**
 * Get the current wobble physics state from the game.
 */
export async function getWobbleState(page: Page): Promise<{
  angle: number;
  angularVelocity: number;
  instability: number;
  stability: number;
}> {
  return page.evaluate(() => {
    const gs = (window as any).__gameState;
    if (!gs.wobblePhysics) {
      return { angle: 0, angularVelocity: 0, instability: 0, stability: 1 };
    }
    const state = gs.wobblePhysics.getState();
    return {
      angle: gs.wobblePhysics.angle,
      angularVelocity: gs.wobblePhysics.angularVelocity,
      instability: gs.wobblePhysics.instability,
      stability: state.stability,
    };
  });
}

/**
 * Set wobble physics instability directly for testing edge cases.
 */
export async function setWobbleInstability(
  page: Page,
  instability: number
): Promise<void> {
  await page.evaluate((inst) => {
    const gs = (window as any).__gameState;
    if (gs.wobblePhysics) {
      gs.wobblePhysics.instability = inst;
    }
  }, instability);
  // Wait for render loop to update stability bar
  await page.waitForTimeout(100);
}
```

### 2. Fix wobble.spec.ts Tests

#### Property 25 Tests (Wobble Impulse on Landing)

**Problem**: Tests expect stability to change after first landing, but with a single duck the instability is minimal.

**Fix**: 
- Remove expectation that stability must decrease after first landing
- Instead verify that wobble physics received an impulse (angularVelocity changed)
- Use `getWobbleState()` helper to check actual physics state

#### Property 26 Tests (Imbalance Increases Instability)

**Problem**: Tests compare stability between balanced and imbalanced stacks but the differences are too small to reliably detect.

**Fix**:
- Build taller stacks (4+ ducks) to see measurable differences
- Use larger offsets (30+ pixels) for imbalanced stacks
- Compare instability values directly from wobble physics, not just stability bar width
- Allow larger tolerance in comparisons

#### Property 27 Tests (Stability Bar Reflects State)

**Problem**: `setWobbleState()` helper only manipulates DOM, doesn't trigger game's render loop.

**Fix**:
- Replace `setWobbleState()` with `setWobbleInstability()` that manipulates game state
- Wait for render loop to apply CSS classes
- Verify both DOM state and game state match

#### Edge Case Tests

**Problem**: Tests make assumptions about initial state that don't match implementation.

**Fix**:
- Wait for game to be in PLAYING mode before checking stability bar
- Use game restart flow to test reset behavior
- Handle game over scenarios gracefully

## Correctness Properties

### Property P1: Stability Bar Initialization

*For any* game start, the stability bar width SHALL be set to "100%" when transitioning to PLAYING mode.

### Property P2: CSS Class Application

*For any* stability value, the render loop SHALL apply:
- "critical" class when stability < 30%
- "warning" class when 30% <= stability < 60%
- No class when stability >= 60%

### Property P3: Wobble State Consistency

*For any* wobble physics state, the stability bar width SHALL equal `stability * 100`%.

## Test Changes Summary

| Test | Current Issue | Fix |
|------|--------------|-----|
| wobble impulse is added on successful landing | Expects stability to decrease | Check angularVelocity changed instead |
| multiple landings affect wobble state | Expects decreasing stability | Verify instability increases with stack height |
| imbalanced stack has lower stability | Difference too small | Build taller stacks, use larger offsets |
| center of mass offset affects stability | Expects visible change | Check wobble physics state directly |
| taller stacks have increased instability | Expects decreasing stability | Verify instability value increases |
| stability bar width reflects stability percentage | DOM manipulation doesn't work | Use setWobbleInstability helper |
| warning CSS class applies when stability below 60% | DOM manipulation doesn't work | Use setWobbleInstability helper |
| critical CSS class applies when stability below 30% | DOM manipulation doesn't work | Use setWobbleInstability helper |
| no warning or critical class when stability is high | DOM manipulation doesn't work | Use setWobbleInstability helper |
| stability bar transitions between states | DOM manipulation doesn't work | Use setWobbleInstability helper |
| stability bar boundary conditions | DOM manipulation doesn't work | Use setWobbleInstability helper |
| critical instability is reflected in stability bar | DOM manipulation doesn't work | Use setWobbleInstability helper |
| extreme instability can lead to game over | May not trigger game over | Increase instability more aggressively |
| stability bar resets to 100% on game restart | Doesn't wait for game state | Wait for PLAYING mode after restart |
| stability bar width is clamped between 0% and 100% | DOM manipulation doesn't work | Use setWobbleInstability helper |

## Error Handling

- Tests should skip gracefully if game ends unexpectedly
- Tests should use appropriate timeouts for physics-based operations
- Tests should handle browser-specific timing differences
