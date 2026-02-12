# Requirements Document

## Introduction

This spec addresses all remaining E2E test issues in the Psyduck's Infinite Headache game. Despite previous fixes in the `fix-wobble-tests` spec, several test issues persist including hanging tests, skipped tests, timeout issues, and unused code. This spec provides a comprehensive fix for all identified E2E test problems.

## Glossary

- **Test_Suite**: The Playwright E2E test suite located in `tests/e2e/`
- **Wobble_Tests**: Tests in `tests/e2e/mechanics/wobble.spec.ts` that verify wobble physics
- **Merge_Tests**: Tests in `tests/e2e/mechanics/merge.spec.ts` that verify merge mechanics
- **AI_Tests**: Tests in `tests/e2e/ai-controlled.spec.ts` that use AI-driven gameplay
- **waitForFunction**: Playwright method that waits for a condition to be true in the browser
- **Game_State**: The `window.__gameState` object exposed by the game for test assertions
- **Hanging_Test**: A test that never completes because its wait condition never resolves

## Requirements

### Requirement 1: Fix Hanging Wobble Tests

**User Story:** As a developer, I want wobble tests to complete reliably, so that CI pipelines don't hang indefinitely.

#### Acceptance Criteria

1. WHEN a wobble test drops a duck, THE Test_Suite SHALL use a wait condition that handles all possible outcomes (score increase, game over, OR timeout)
2. WHEN a duck is falling but hasn't landed yet, THE Test_Suite SHALL detect this state and handle it appropriately
3. IF a wait condition times out, THEN THE Test_Suite SHALL fail the test gracefully rather than hanging
4. THE Test_Suite SHALL remove or utilize the unused `createImbalancedStack` and `createBalancedStack` helper functions
5. WHEN waiting for duck landing, THE Test_Suite SHALL include a fallback timeout that triggers test failure with a descriptive message

### Requirement 2: Fix Skipped Merge Tests

**User Story:** As a developer, I want all merge tests to run, so that merge mechanics are fully validated.

#### Acceptance Criteria

1. THE Test_Suite SHALL either fix or remove the skipped "mergeCount resets to 0 after merge" test
2. THE Test_Suite SHALL either fix or remove the skipped "merge triggers at exact threshold boundary" test
3. WHEN a merge test is fixed, THE Test_Suite SHALL verify the test passes reliably across multiple runs
4. IF a skipped test cannot be fixed, THEN THE Test_Suite SHALL document why and remove the test

### Requirement 3: Optimize AI-Controlled Test Timeouts

**User Story:** As a developer, I want AI-controlled tests to complete within reasonable time, so that test runs are efficient.

#### Acceptance Criteria

1. THE Test_Suite SHALL configure appropriate timeouts for AI-controlled tests (30 seconds instead of 60 seconds)
2. WHEN an AI test performs multiple duck drops, THE Test_Suite SHALL use efficient wait conditions between drops
3. THE Test_Suite SHALL reduce unnecessary `waitForTimeout` delays in AI tests where possible
4. WHEN waiting for duck landing in AI tests, THE Test_Suite SHALL use the same robust wait pattern as other tests

### Requirement 4: Clean Up Unused Helper Code

**User Story:** As a developer, I want clean test code without unused functions, so that the codebase is maintainable.

#### Acceptance Criteria

1. THE Test_Suite SHALL remove the unused `createImbalancedStack` function from wobble.spec.ts OR use it in tests
2. THE Test_Suite SHALL remove the unused `createBalancedStack` function from wobble.spec.ts OR use it in tests
3. WHEN removing unused code, THE Test_Suite SHALL verify no tests break as a result

### Requirement 5: Improve Wait Condition Reliability

**User Story:** As a developer, I want robust wait conditions, so that tests don't hang on edge cases.

#### Acceptance Criteria

1. THE Test_Suite SHALL create a new helper function `waitForDuckLanding` that handles all landing outcomes
2. WHEN `waitForDuckLanding` is called, THE Test_Suite SHALL wait for score increase, game over, OR a maximum timeout
3. IF the maximum timeout is reached, THEN THE Test_Suite SHALL return a timeout result rather than throwing
4. THE Test_Suite SHALL update all tests that wait for duck landing to use the new helper
5. WHEN a duck is still falling after timeout, THE Test_Suite SHALL provide diagnostic information about the duck state

### Requirement 6: Ensure Test Suite Stability

**User Story:** As a developer, I want all E2E tests to pass reliably, so that CI builds are stable.

#### Acceptance Criteria

1. WHEN all fixes are applied, THE Test_Suite SHALL pass all wobble tests without hanging
2. WHEN all fixes are applied, THE Test_Suite SHALL pass all merge tests (no skipped tests)
3. WHEN all fixes are applied, THE Test_Suite SHALL pass all AI-controlled tests within 30 seconds each
4. THE Test_Suite SHALL have no unused helper functions in test files
5. WHEN running `pnpm test:e2e`, THE Test_Suite SHALL complete without any hanging tests
