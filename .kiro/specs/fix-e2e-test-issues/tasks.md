# Implementation Plan: Fix E2E Test Issues

## Overview

This implementation plan fixes all remaining E2E test issues including hanging wobble tests, skipped merge tests, AI test timeouts, and unused helper code. The approach focuses on creating robust wait conditions and cleaning up test code.

## Tasks

- [x] 1. Create robust landing wait helper
  - [x] 1.1 Add `waitForDuckLandingResult` helper to helpers.ts
    - Create interface `LandingResult` with outcome, score, mode, and duckState
    - Implement function that waits for score increase, game over, timeout, or stuck state
    - Return result object instead of throwing on timeout
    - Include duck state diagnostics in result
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 2. Fix hanging wobble tests
  - [x] 2.1 Update wobble.spec.ts to use new wait helper
    - Replace all `page.waitForFunction` calls that wait for landing with `waitForDuckLandingResult`
    - Handle 'timeout' and 'stuck' outcomes with descriptive error messages
    - Keep existing 'gameover' handling with `test.skip()`
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 2.2 Remove unused helper functions from wobble.spec.ts
    - Remove `createImbalancedStack` function (lines 57-87)
    - Remove `createBalancedStack` function (lines 92-117)
    - Verify no tests reference these functions
    - _Requirements: 1.4, 4.1, 4.2, 4.3_

- [x] 3. Checkpoint - Verify wobble tests pass
  - Run `pnpm test:e2e tests/e2e/mechanics/wobble.spec.ts --project=chromium`
  - Ensure all tests complete without hanging
  - _Requirements: 6.1_

- [x] 4. Fix merge tests
  - [x] 4.1 Verify merge tests are not skipped
    - Check merge.spec.ts for any `test.skip()` calls
    - If tests are skipped, analyze why and fix the underlying issue
    - If tests cannot be fixed, document reason and remove
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 4.2 Update merge tests to use robust wait helper
    - Replace `page.waitForFunction` landing waits with `waitForDuckLandingResult`
    - Ensure consistent error handling across all merge tests
    - _Requirements: 2.3_

- [x] 5. Checkpoint - Verify merge tests pass
  - Run `pnpm test:e2e tests/e2e/mechanics/merge.spec.ts --project=chromium`
  - Ensure all tests run (no skipped tests) and pass
  - _Requirements: 6.2_

- [x] 6. Optimize AI-controlled tests
  - [x] 6.1 Configure appropriate timeouts for AI tests
    - Add `test.setTimeout(30_000)` in beforeEach hook
    - Remove any redundant timeout configurations
    - _Requirements: 3.1_
  
  - [x] 6.2 Update AI tests to use robust wait helper
    - Replace `page.waitForFunction` in `performAIDuckDrop` with `waitForDuckLandingResult`
    - Reduce unnecessary `waitForTimeout` delays where possible
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 7. Checkpoint - Verify AI tests pass
  - Run `pnpm test:e2e tests/e2e/ai-controlled.spec.ts --project=chromium`
  - Ensure all tests complete within 30 seconds each
  - _Requirements: 6.3_

- [x] 8. Final verification
  - [x] 8.1 Run full E2E test suite
    - Execute `pnpm test:e2e --project=chromium`
    - Verify no tests hang or timeout unexpectedly
    - _Requirements: 6.5_
  
  - [x] 8.2 Verify no unused code warnings
    - Run `pnpm check` to verify no TypeScript warnings about unused functions
    - _Requirements: 6.4_

## Notes

- The key fix is replacing the problematic `waitForFunction` pattern that only checks for score increase OR game over
- The new `waitForDuckLandingResult` helper handles all possible outcomes including stuck ducks and timeouts
- Tests should use `test.skip()` for game over scenarios (valid game behavior) but fail for timeout/stuck scenarios (test infrastructure issues)
- AI tests benefit from the same robust wait pattern used in other tests
