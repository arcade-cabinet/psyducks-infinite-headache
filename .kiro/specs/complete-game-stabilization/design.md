# Design Document: Complete Game Stabilization

## Overview

This design document outlines the approach for stabilizing the Psyduck's Infinite Headache E2E test suite. The focus is on fixing failing tests, completing missing test coverage, and ensuring reliable CI/CD pipelines. The implementation uses Playwright for E2E testing with TypeScript, following existing patterns in the codebase.

## Architecture

The test stabilization follows a layered approach:

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Execution Layer                      │
│  (Playwright test runner, CI/CD integration)                 │
├─────────────────────────────────────────────────────────────┤
│                    Test Specification Layer                  │
│  (*.spec.ts files organized by feature/mechanic)            │
├─────────────────────────────────────────────────────────────┤
│                    Helper Functions Layer                    │
│  (helpers.ts - shared utilities, wait conditions)           │
├─────────────────────────────────────────────────────────────┤
│                    Game State Interface                      │
│  (window.__gameState - exposed game state for assertions)   │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Robust Wait Conditions**: Use `waitForDuckLandingResult` for all landing scenarios to handle all outcomes (landed, gameover, timeout, stuck)
2. **Deterministic Testing**: Use seeded randomness for reproducible test scenarios
3. **Graceful Degradation**: Tests should fail with diagnostic information rather than hang
4. **Separation of Concerns**: Test files organized by feature area

## Components and Interfaces

### 1. Enhanced Helper Functions

The `tests/e2e/helpers.ts` module provides shared utilities:

```typescript
// Existing helpers (already implemented)
export async function waitForDuckLandingResult(
  page: Page,
  previousScore: number,
  timeout?: number
): Promise<LandingResult>;

export async function waitForNewDuckResult(
  page: Page,
  timeout?: number
): Promise<NewDuckResult>;

export async function positionDuckOverStack(
  page: Page,
  offsetFromCenter?: number
): Promise<number>;

// New helpers needed for missing tests
export async function waitForAutoDropTrigger(
  page: Page,
  timeout?: number
): Promise<boolean>;

export async function getCameraState(
  page: Page
): Promise<{ cameraY: number; targetCameraY: number }>;

export async function getParticleCount(page: Page): Promise<number>;

export async function clearParticles(page: Page): Promise<void>;
```

### 2. Test File Organization

```
tests/e2e/
├── ai-controlled.spec.ts      # AI gameplay tests (fix timeouts)
├── collision/
│   ├── perfect-landing.spec.ts # Fix particle detection
│   ├── swept-collision.spec.ts # Fix prevY/y crossing
│   └── scaled-collision.spec.ts # Fix grown duck collision
├── boundaries/
│   └── drag-bounds.spec.ts    # Fix clamping consistency
├── mechanics/
│   ├── autodrop.spec.ts       # NEW: Auto-drop timer tests
│   ├── camera.spec.ts         # NEW: Camera system tests
│   ├── particles.spec.ts      # NEW: Particle lifecycle tests
│   └── wobble.spec.ts         # Existing (already fixed)
├── seeded/
│   ├── reproducibility.spec.ts # NEW: Seed reproducibility
│   └── seed-ui.spec.ts        # NEW: Seed UI tests
├── responsive/
│   └── scaling.spec.ts        # NEW: Responsive scaling tests
├── ui/
│   ├── score-display.spec.ts  # NEW: Score display tests
│   └── screens.spec.ts        # NEW: Screen transition tests
├── visual/
│   ├── rendering.spec.ts      # NEW: Canvas rendering tests
│   └── animations.spec.ts     # NEW: Animation tests
├── edge-cases/
│   ├── timing-edge.spec.ts    # NEW: Timing edge cases
│   └── concurrent-events.spec.ts # NEW: Concurrent events
└── pwa/
    └── manifest.spec.ts       # NEW: PWA manifest tests
```

### 3. LandingResult Interface

```typescript
interface LandingResult {
  outcome: "landed" | "gameover" | "timeout" | "stuck";
  score: number;
  mode: string;
  duckState?: {
    isFalling: boolean;
    isStatic: boolean;
    y: number;
  };
}
```

## Data Models

### Game State Structure (from window.__gameState)

```typescript
interface GameState {
  mode: "MENU" | "PLAYING" | "GAMEOVER" | "LEVELUP";
  score: number;
  highScore: number;
  level: number;
  seed: string;
  ducks: Duck[];
  currentDuck: Duck | null;
  particles: Particle[];
  cameraY: number;
  targetCameraY: number;
  width: number;
  height: number;
  scale: number;
  mergeCount: number;
  wobblePhysics: WobblePhysics;
}

interface Duck {
  x: number;
  y: number;
  prevY: number;
  w: number;
  h: number;
  isStatic: boolean;
  isFalling: boolean;
  isBeingDragged: boolean;
  scaleX: number;
  scaleY: number;
  mergeLevel: number;
}

interface Particle {
  x: number;
  y: number;
  life: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stuck Duck Detection
*For any* duck that is static but score didn't increase, the test helper SHALL detect this as a "stuck" outcome and provide diagnostic information.
**Validates: Requirements 1.5**

### Property 2: Perfect Landing Particle Spawn
*For any* duck landing within perfectTolerance (8px) of the top duck's center, particles SHALL spawn within 500ms of landing.
**Validates: Requirements 2.1, 2.2**

### Property 3: Perfect Landing Combined Behavior
*For any* perfect landing, both x-position snap AND particle spawn SHALL occur simultaneously.
**Validates: Requirements 2.4**

### Property 4: Swept Collision Detection
*For any* falling duck where prevY is above targetY and y crosses below targetY while x is within hitTolerance, the duck SHALL land successfully.
**Validates: Requirements 3.1**

### Property 5: Scaled Collision Zone
*For any* base duck that has grown via merges, the collision zone (hitTolerance × width) SHALL scale proportionally with the duck's width.
**Validates: Requirements 3.2**

### Property 6: Drag Boundary Clamping
*For any* drag operation moving the duck beyond canvas boundaries, the duck's x-position SHALL be clamped to valid [halfWidth, width - halfWidth] range.
**Validates: Requirements 4.1, 4.4**

### Property 7: Auto-Drop Timer Behavior
*For any* spawned duck, the auto-drop timer SHALL start, and when expired, the duck SHALL transition to falling state. Manual drops SHALL clear the timer. Timer duration SHALL decrease by 200ms per level, clamped to minimum 1500ms.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 8: Camera System Behavior
*For any* duck landing, targetCameraY SHALL update, cameraY SHALL smoothly interpolate toward target, and for tall stacks, the top duck SHALL remain at approximately 70% screen height. On restart, camera SHALL reset to 0.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 9: Particle Lifecycle
*For any* particle with life <= 0, it SHALL be removed from the array. Perfect landings SHALL spawn 20 particles. Merge events SHALL spawn particles at base duck position.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 10: Seed Reproducibility
*For any* seed used twice, the game SHALL produce identical spawn positions and identical level configs.
**Validates: Requirements 8.1, 8.2**

### Property 11: Seed UI Behavior
*For any* seed entered in input, the game SHALL use that seed. Shuffle SHALL generate a new seed. Game over SHALL display the correct seed.
**Validates: Requirements 8.3, 8.4, 8.5**

### Property 12: Responsive Scaling
*For any* viewport width, designWidth SHALL be clamped to [412, 800]. Scale factor SHALL update correctly on resize.
**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 13: Score Display Updates
*For any* duck landing, score display SHALL update. High score beats SHALL update localStorage.
**Validates: Requirements 10.2, 10.3**

### Property 14: Canvas Rendering
*For any* playing state, canvas SHALL not be all-black. Retry SHALL not show black screen. Level colors SHALL be applied.
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 15: Spawn Timing
*For any* landing, new duck SHALL spawn at correct interval based on level config.
**Validates: Requirements 12.1**

### Property 16: Squish Animation
*For any* duck landing, squish animation SHALL trigger with scaleY decreasing and scaleX increasing, then recovering to 1.0 over time.
**Validates: Requirements 13.1, 13.2, 13.3**

## Error Handling

### Test Timeout Handling

All tests that wait for game events use the `waitForDuckLandingResult` pattern:

```typescript
const result = await waitForDuckLandingResult(page, scoreBefore, 15000);

switch (result.outcome) {
  case "landed":
    // Success - verify expected state
    break;
  case "gameover":
    // Valid game outcome - may skip or verify game over state
    break;
  case "timeout":
    // Test infrastructure issue - fail with diagnostics
    throw new Error(`Landing timeout: ${JSON.stringify(result.duckState)}`);
  case "stuck":
    // Edge case - fail with diagnostics
    throw new Error(`Duck stuck: ${JSON.stringify(result.duckState)}`);
}
```

### AI Test Timeout Configuration

AI tests use 30-second timeouts with efficient polling:

```typescript
test.beforeEach(async () => {
  test.setTimeout(30_000);
});
```

### Particle Detection Retry

Particle tests clear particles before each test and use immediate detection after landing:

```typescript
await clearParticles(page);
// ... perform landing ...
await page.waitForTimeout(100); // Allow particle spawn
const count = await getParticleCount(page);
expect(count).toBeGreaterThan(0);
```

## Testing Strategy

### Dual Testing Approach

1. **Unit Tests** (Vitest): Test pure game logic in `src/scripts/game.ts`
2. **E2E Tests** (Playwright): Test integrated game behavior through browser

### Property-Based Testing Configuration

- Minimum 100 iterations per property test where applicable
- Use `repeatEach` config for flaky test detection
- Tag format: **Feature: complete-game-stabilization, Property {number}: {property_text}**

### Test Categories

| Category | Test Type | Focus |
|----------|-----------|-------|
| AI Tests | Example | Verify AI can interact with game |
| Collision Tests | Property | Verify collision detection for all positions |
| Boundary Tests | Property | Verify clamping for all drag positions |
| Timer Tests | Property | Verify timer behavior across levels |
| Camera Tests | Property | Verify camera tracking for all stack heights |
| Particle Tests | Property | Verify particle lifecycle |
| Seed Tests | Property | Verify reproducibility for all seeds |
| Scaling Tests | Property | Verify scaling for all viewport sizes |
| UI Tests | Example | Verify specific UI interactions |
| Visual Tests | Property | Verify rendering for all game states |
| Animation Tests | Property | Verify animation timing |
| PWA Tests | Example | Verify PWA manifest and meta tags |

### Test Execution Order

1. Fix failing tests first (AI, perfect landing, collision, drag bounds)
2. Implement missing mechanics tests (autodrop, camera, particles)
3. Implement missing feature tests (seeded, responsive, UI, visual)
4. Implement edge case tests (timing, concurrent events)
5. Implement PWA tests
6. Run full suite verification

### CI/CD Integration

Tests run on Chromium by default with Firefox and WebKit as secondary targets:

```bash
# Primary CI command
pnpm test:e2e --project=chromium

# Full cross-browser (optional)
pnpm test:e2e
```
