# Requirements: Fix Wobble Test Failures

## Overview

The wobble physics E2E tests in `tests/e2e/mechanics/wobble.spec.ts` are failing due to mismatches between test expectations and actual game implementation. This spec addresses the test failures by either fixing the tests to match the actual implementation or fixing the implementation to match the expected behavior.

## Problem Analysis

### Root Causes

1. **Stability Bar Initial State**: Tests expect `stabilityBar.style.width = "100%"` immediately, but the game only sets this when transitioning to PLAYING mode
2. **CSS Class Application**: Tests use `setWobbleState()` helper that manipulates DOM directly but doesn't trigger the game's render loop that applies CSS classes
3. **Stability Calculation**: The wobble physics calculates stability as `1 - instability`, but instability starts at 0 and only changes during `update()` calls
4. **Test Isolation**: Tests manipulate DOM state without going through the game's state management

### Failing Tests (15 in Chromium, similar in WebKit)

- Property 25: Wobble Impulse on Landing (2 tests)
- Property 26: Imbalance Increases Instability (3 tests)  
- Property 27: Stability Bar Reflects State (7 tests)
- Wobble Critical Instability (2 tests)
- Wobble Edge Cases (1 test)

## User Stories

### US-1: Fix Stability Bar Initial State Tests

As a test author, I want the stability bar tests to correctly verify the initial state so that tests pass reliably.

**Acceptance Criteria:**
- 1.1 Tests SHALL wait for game to be in PLAYING mode before checking stability bar width
- 1.2 Tests SHALL verify stability bar width is "100%" after game starts
- 1.3 Tests SHALL NOT assume stability bar has inline styles before game starts

### US-2: Fix CSS Class Application Tests

As a test author, I want CSS class tests to work with the game's actual rendering so that tests accurately verify behavior.

**Acceptance Criteria:**
- 2.1 Tests SHALL trigger game state changes through proper game APIs, not direct DOM manipulation
- 2.2 Tests SHALL wait for render loop to apply CSS classes after state changes
- 2.3 The `setWobbleState()` helper SHALL be updated to work with the game's wobble physics
- 2.4 Tests SHALL verify CSS classes are applied by the game's render loop

### US-3: Fix Wobble Impulse Tests

As a test author, I want wobble impulse tests to correctly verify landing effects so that tests pass reliably.

**Acceptance Criteria:**
- 3.1 Tests SHALL verify wobble state changes after landing through game state, not just DOM
- 3.2 Tests SHALL account for the fact that stability may not visibly change on first landing
- 3.3 Tests SHALL use appropriate tolerances for stability comparisons

### US-4: Fix Imbalance Tests

As a test author, I want imbalance tests to correctly measure stability differences so that tests pass reliably.

**Acceptance Criteria:**
- 4.1 Tests SHALL build sufficient stack height to see measurable stability differences
- 4.2 Tests SHALL use larger offsets to create more noticeable imbalance
- 4.3 Tests SHALL compare stability trends rather than exact values

### US-5: Fix Edge Case Tests

As a test author, I want edge case tests to handle game state correctly so that tests pass reliably.

**Acceptance Criteria:**
- 5.1 Stability bar reset test SHALL verify reset through game restart flow
- 5.2 Stability bar clamping test SHALL verify through actual game physics
- 5.3 Tests SHALL handle game over scenarios gracefully

## Technical Notes

- The game's stability bar is updated in the render loop at ~60fps
- Stability is calculated as `1 - instability` where instability depends on stack height and imbalance
- CSS classes (warning, critical) are applied based on stability percentage thresholds
- The `setWobbleState()` helper needs to either manipulate game state or be removed in favor of gameplay-based testing
