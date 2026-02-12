# Design Document

## Overview

This design addresses all remaining E2E test issues in the Psyduck's Infinite Headache game. The primary issues are:

1. **Hanging wobble tests** - Tests use `waitForFunction` that waits for score increase OR game over, but if the duck is still falling, neither condition is met and the test hangs indefinitely.
2. **Skipped merge tests** - Two tests are marked with `test.skip()` and need to be fixed or removed.
3. **AI test timeouts** - Tests pass with 30s timeout but fail with default 60s timeout, indicating inefficient wait patterns.
4. **Unused helper functions** - `createImbalancedStack` and `createBalancedStack` are declared but never used.

## Architecture

The test suite architecture involves:

```
tests/e2e/
├── helpers.ts                    # Shared test utilities
├── ai-controlled.spec.ts         # AI-driven gameplay tests
└── mechanics/
    ├── wobble.spec.ts            # Wobble physics tests (HANGING)
    ├── merge.spec.ts             # Merge mechanics tests (SKIPPED)
    └── levelup.spec.ts           # Level up tests
```

### Current Wait Pattern (Problematic)

```typescript
// This pattern hangs if duck is still falling
await page.waitForFunction(
  (prevScore) => {
    const gs = (window as any).__gameState;
    return gs.score > prevScore || gs.mode === "GAMEOVER";
  },
  scoreBefore,
  { timeout: 15000 },
);
```

**Problem**: If the duck is still falling (hasn't landed yet), neither condition is true. The test waits until timeout, then throws an error. But in some cases, the duck may be falling very slowly or stuck, causing indefinite hangs.

### Proposed Wait Pattern (Robust)

```typescript
// This pattern handles all outcomes including stuck ducks
await page.waitForFunction(
  (prevScore) => {
    const gs = (window as any).__gameState;
    const currentDuck = gs.currentDuck;
    
    // Success: score increased
    if (gs.score > prevScore) return { result: 'landed' };
    
    // Failure: game over
    if (gs.mode === "GAMEOVER") return { result: 'gameover' };
    
    // Still waiting: duck is falling
    if (currentDuck?.isFalling) return false;
    
    // Edge case: duck is static but score didn't increase (shouldn't happen)
    if (currentDuck?.isStatic) return { result: 'stuck' };
    
    return false;
  },
  scoreBefore,
  { timeout: 15000 },
);
```

## Components and Interfaces

### 1. New Helper: `waitForDuckLandingResult`

```typescript
interface LandingResult {
  outcome: 'landed' | 'gameover' | 'timeout' | 'stuck';
  score: number;
  mode: string;
  duckState?: {
    isFalling: boolean;
    isStatic: boolean;
    y: number;
  };
}

/**
 * Wait for duck landing with comprehensive outcome handling.
 * Never hangs - always returns a result or times out gracefully.
 */
export async function waitForDuckLandingResult(
  page: Page,
  previousScore: number,
  timeout = 15000
): Promise<LandingResult>;
```

### 2. Updated Wobble Test Pattern

Replace all instances of the problematic wait pattern with the new helper:

```typescript
// Before (hangs)
await page.waitForFunction(...);
const mode = await getGameState(page, "mode");
if (mode === "GAMEOVER") {
  test.skip(true, "Game ended");
  return;
}

// After (robust)
const result = await waitForDuckLandingResult(page, scoreBefore);
if (result.outcome === 'gameover') {
  test.skip(true, "Game ended before we could verify wobble");
  return;
}
if (result.outcome === 'timeout' || result.outcome === 'stuck') {
  throw new Error(`Duck landing failed: ${result.outcome}, duck state: ${JSON.stringify(result.duckState)}`);
}
```

### 3. Merge Test Fixes

The skipped tests have issues with their wait conditions. Analysis:

**"mergeCount resets to 0 after merge"** - This test is NOT skipped in the current code. It exists and runs.

**"merge triggers at exact threshold boundary"** - This test is NOT skipped in the current code. It exists and runs.

After reviewing the merge.spec.ts file, I see that NO tests are actually skipped with `test.skip()`. The tests exist and should run. The issue may be that they were previously skipped but have been fixed.

### 4. AI Test Timeout Configuration

```typescript
test.describe("AI-Controlled Gameplay Tests", () => {
  // Set 30s timeout for all AI tests
  test.beforeEach(async () => {
    test.setTimeout(30_000);
  });
  
  // ... tests
});
```

### 5. Unused Helper Cleanup

The `createImbalancedStack` and `createBalancedStack` functions in wobble.spec.ts are unused. Options:

**Option A: Remove them** - They're not used by any test.
**Option B: Use them** - Replace inline stack-building code with these helpers.

**Decision**: Remove them. The tests that need to build stacks already have inline implementations that work correctly. The helpers were likely created for future use but never integrated.

## Data Models

No new data models required. The existing `GameState` interface exposed via `window.__gameState` is sufficient.



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, most acceptance criteria are examples (specific verification points) rather than universal properties. The test fixes are primarily about code quality and reliability rather than algorithmic correctness. However, one key property emerges:

### Property 1: Landing Result Completeness

*For any* call to `waitForDuckLandingResult` with any game state, the function SHALL return one of exactly four outcomes: 'landed', 'gameover', 'timeout', or 'stuck' - never hanging indefinitely.

**Validates: Requirements 5.2**

This property ensures the new helper function is total (always returns) and covers all possible game states.

### Verification Examples

The remaining acceptance criteria are best verified as examples during implementation:

1. **Wobble tests complete** - Run `pnpm test:e2e tests/e2e/mechanics/wobble.spec.ts` and verify no hangs
2. **Merge tests run** - Verify no `test.skip()` calls remain in merge.spec.ts
3. **AI tests efficient** - Verify AI tests complete within 30 seconds
4. **No unused code** - Verify no TypeScript warnings about unused functions

## Error Handling

### Timeout Handling

When `waitForDuckLandingResult` times out:
1. Capture current duck state (isFalling, isStatic, y position)
2. Return a `LandingResult` with outcome 'timeout' and diagnostic info
3. Let the calling test decide how to handle (skip, fail, retry)

### Game Over During Test

When game ends unexpectedly:
1. Return `LandingResult` with outcome 'gameover'
2. Calling test can use `test.skip()` with descriptive message
3. Test is marked as skipped, not failed

### Stuck Duck Detection

When duck is static but score didn't increase:
1. Return `LandingResult` with outcome 'stuck'
2. Include duck state for debugging
3. Calling test should fail with diagnostic message

## Testing Strategy

### Dual Testing Approach

Since this spec fixes test code rather than game code, the testing strategy is:

1. **Manual verification** - Run the test suite and verify:
   - No tests hang
   - No tests are skipped (except intentionally)
   - All tests complete within timeout

2. **CI verification** - The GitHub Actions CI pipeline will validate:
   - All E2E tests pass
   - No timeout failures
   - Test suite completes in reasonable time

### Property-Based Testing

Property 1 (Landing Result Completeness) could be tested with property-based testing by:
- Generating random game states
- Calling `waitForDuckLandingResult`
- Verifying it always returns one of the four outcomes

However, since this is test infrastructure code, we'll verify it through integration testing (running the actual tests that use it).

### Test Execution Plan

1. Run wobble tests: `pnpm test:e2e tests/e2e/mechanics/wobble.spec.ts --project=chromium`
2. Run merge tests: `pnpm test:e2e tests/e2e/mechanics/merge.spec.ts --project=chromium`
3. Run AI tests: `pnpm test:e2e tests/e2e/ai-controlled.spec.ts --project=chromium`
4. Run full suite: `pnpm test:e2e`

All tests should pass without hanging or timing out.
