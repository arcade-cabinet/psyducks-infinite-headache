# Requirements Document

## Introduction

This document specifies requirements for stabilizing the Psyduck's Infinite Headache E2E test suite. The goal is to fix all failing tests, complete missing test coverage from the comprehensive-e2e-testing spec, and ensure reliable CI/CD pipelines. This spec focuses on test stabilization rather than new game features.

## Glossary

- **Test_Suite**: The Playwright E2E test suite located in `tests/e2e/`
- **AI_Tests**: Tests in `tests/e2e/ai-controlled.spec.ts` using Yuka-based AI gameplay
- **Perfect_Landing_Tests**: Tests in `tests/e2e/collision/perfect-landing.spec.ts` verifying snap and particle behavior
- **Swept_Collision_Tests**: Tests in `tests/e2e/collision/swept-collision.spec.ts` verifying prevY/y crossing detection
- **Scaled_Collision_Tests**: Tests in `tests/e2e/collision/scaled-collision.spec.ts` verifying grown duck collision zones
- **Drag_Bounds_Tests**: Tests in `tests/e2e/boundaries/drag-bounds.spec.ts` verifying boundary clamping
- **Game_State**: The `window.__gameState` object exposed by the game for test assertions
- **Particle_System**: Visual effects spawned on perfect landings and merges
- **Auto_Drop_Timer**: Timer that automatically drops duck after timeout
- **Camera_System**: View following mechanism that tracks stack height

## Requirements

### Requirement 1: Fix AI-Controlled Test Failures

**User Story:** As a developer, I want AI-controlled tests to pass reliably, so that automated gameplay testing validates game mechanics.

#### Acceptance Criteria

1. WHEN the AI test "AI should navigate through menu and start game" runs, THE Test_Suite SHALL complete within 30 seconds without timeout
2. WHEN the AI test "AI should detect and respond to stability warnings" runs, THE Test_Suite SHALL verify stability bar state without hanging
3. WHEN the AI test "AI should successfully play several rounds" runs, THE Test_Suite SHALL complete at least 2 successful drops or reach game over
4. WHEN the AI test "AI keyboard: ArrowLeft/Right + Space positioning and dropping" runs, THE Test_Suite SHALL verify keyboard controls work correctly
5. IF an AI test encounters a stuck duck state, THEN THE Test_Suite SHALL detect and handle it gracefully with diagnostic output
6. THE Test_Suite SHALL use `waitForDuckLandingResult` helper consistently across all AI tests

### Requirement 2: Fix Perfect Landing Test Failures

**User Story:** As a developer, I want perfect landing tests to pass reliably, so that the snap and particle mechanics are validated.

#### Acceptance Criteria

1. WHEN a duck lands within perfectTolerance (8px), THE Test_Suite SHALL verify particles spawn within 500ms of landing
2. WHEN multiple perfect landings occur, THE Test_Suite SHALL verify particles spawn for each landing independently
3. WHEN testing perfect landing snap, THE Test_Suite SHALL position duck precisely using direct state manipulation if arrow keys cannot achieve tolerance
4. WHEN testing "perfect landing snaps position AND spawns particles simultaneously", THE Test_Suite SHALL verify both conditions in a single landing
5. IF particle detection fails due to timing, THEN THE Test_Suite SHALL retry with extended wait or provide diagnostic information
6. THE Test_Suite SHALL clear particles before each test to ensure accurate spawn detection

### Requirement 3: Fix Collision Detection Test Failures

**User Story:** As a developer, I want collision tests to pass reliably, so that landing and miss mechanics are validated.

#### Acceptance Criteria

1. WHEN testing swept collision "duck lands when prevY is above targetY and y crosses below within hit tolerance", THE Test_Suite SHALL verify the swept collision detection algorithm works correctly
2. WHEN testing scaled collision "landing at expanded boundary succeeds with grown duck", THE Test_Suite SHALL verify collision zone scales with duck width
3. WHEN a collision test manipulates duck width, THE Test_Suite SHALL wait for game state to update before dropping
4. IF a collision test results in unexpected game over, THEN THE Test_Suite SHALL provide diagnostic information about duck position and collision zone
5. THE Test_Suite SHALL use consistent seed values for reproducible collision scenarios

### Requirement 4: Fix Drag Bounds Test Failures

**User Story:** As a developer, I want drag boundary tests to pass reliably, so that duck positioning constraints are validated.

#### Acceptance Criteria

1. WHEN testing "drag right clamps duck x-position to width - halfWidth", THE Test_Suite SHALL verify clamping occurs during drag operation
2. WHEN drag events are simulated, THE Test_Suite SHALL use sufficient steps and delays for reliable position updates
3. IF drag position does not update as expected, THEN THE Test_Suite SHALL verify drag state is active before asserting position
4. THE Test_Suite SHALL verify bounds calculation uses current duck width, not hardcoded values

### Requirement 5: Complete Auto-Drop Timer Tests

**User Story:** As a developer, I want auto-drop timer tests, so that time pressure mechanics are validated.

#### Acceptance Criteria

1. WHEN a duck spawns, THE Test_Suite SHALL verify auto-drop timer starts
2. WHEN auto-drop timer expires, THE Test_Suite SHALL verify duck transitions to falling state
3. WHEN duck is manually dropped, THE Test_Suite SHALL verify auto-drop timer is cleared
4. WHEN level increases, THE Test_Suite SHALL verify auto-drop time decreases by 200ms per level
5. WHEN auto-drop time would go below 1500ms, THE Test_Suite SHALL verify it clamps to 1500ms
6. THE Test_Suite SHALL create `tests/e2e/mechanics/autodrop.spec.ts` with these tests

### Requirement 6: Complete Camera System Tests

**User Story:** As a developer, I want camera system tests, so that view following mechanics are validated.

#### Acceptance Criteria

1. WHEN duck lands, THE Test_Suite SHALL verify targetCameraY updates
2. WHEN targetCameraY changes, THE Test_Suite SHALL verify cameraY smoothly interpolates toward target
3. WHEN stack grows tall, THE Test_Suite SHALL verify camera keeps top duck at approximately 70% screen height
4. WHEN game restarts, THE Test_Suite SHALL verify camera resets to 0
5. THE Test_Suite SHALL create `tests/e2e/mechanics/camera.spec.ts` with these tests

### Requirement 7: Complete Particle System Tests

**User Story:** As a developer, I want particle lifecycle tests, so that visual effects are validated.

#### Acceptance Criteria

1. WHEN particle life reaches 0, THE Test_Suite SHALL verify particle is removed from array
2. WHEN many particles exist, THE Test_Suite SHALL verify cleanup occurs correctly
3. WHEN perfect landing occurs, THE Test_Suite SHALL verify 20 particles spawn
4. WHEN merge occurs, THE Test_Suite SHALL verify particles spawn at base duck position
5. THE Test_Suite SHALL create `tests/e2e/mechanics/particles.spec.ts` with these tests

### Requirement 8: Complete Seeded Randomness Tests

**User Story:** As a developer, I want seeded randomness tests, so that reproducible gameplay is validated.

#### Acceptance Criteria

1. WHEN same seed is used twice, THE Test_Suite SHALL verify identical spawn positions
2. WHEN same seed is used twice, THE Test_Suite SHALL verify identical level configs
3. WHEN seed is entered in input, THE Test_Suite SHALL verify game uses that seed
4. WHEN shuffle button is clicked, THE Test_Suite SHALL verify new seed is generated
5. WHEN game over shows seed, THE Test_Suite SHALL verify it matches active game seed
6. THE Test_Suite SHALL create `tests/e2e/seeded/reproducibility.spec.ts` and `tests/e2e/seeded/seed-ui.spec.ts`

### Requirement 9: Complete Responsive Scaling Tests

**User Story:** As a developer, I want responsive scaling tests, so that the game works across viewport sizes.

#### Acceptance Criteria

1. WHEN viewport width < 412px, THE Test_Suite SHALL verify designWidth is 412
2. WHEN viewport width is between 412-800px, THE Test_Suite SHALL verify designWidth equals viewport width
3. WHEN viewport width > 800px, THE Test_Suite SHALL verify designWidth is capped at 800
4. WHEN viewport is resized, THE Test_Suite SHALL verify scale factor updates correctly
5. THE Test_Suite SHALL create `tests/e2e/responsive/scaling.spec.ts` with these tests

### Requirement 10: Complete UI Element Tests

**User Story:** As a developer, I want UI element tests, so that interface components are validated.

#### Acceptance Criteria

1. WHEN game starts, THE Test_Suite SHALL verify score display shows 0
2. WHEN duck lands, THE Test_Suite SHALL verify score display updates
3. WHEN high score is beaten, THE Test_Suite SHALL verify localStorage updates
4. WHEN help button is clicked, THE Test_Suite SHALL verify help screen shows
5. THE Test_Suite SHALL create `tests/e2e/ui/score-display.spec.ts` and `tests/e2e/ui/screens.spec.ts`

### Requirement 11: Complete Visual Rendering Tests

**User Story:** As a developer, I want visual rendering tests, so that canvas rendering is validated.

#### Acceptance Criteria

1. WHEN game is playing, THE Test_Suite SHALL verify canvas is not all-black
2. WHEN retry is clicked, THE Test_Suite SHALL verify no black screen appears
3. WHEN background renders, THE Test_Suite SHALL verify level colors are applied
4. THE Test_Suite SHALL create `tests/e2e/visual/rendering.spec.ts` with these tests

### Requirement 12: Complete Edge Case Tests

**User Story:** As a developer, I want edge case tests, so that unusual scenarios are handled gracefully.

#### Acceptance Criteria

1. WHEN spawn timing fires after landing, THE Test_Suite SHALL verify new duck spawns at correct time
2. WHEN merge triggers at exact moment of level up threshold, THE Test_Suite SHALL verify both events process correctly
3. WHEN clipboard copy fails, THE Test_Suite SHALL verify error is handled gracefully
4. THE Test_Suite SHALL create `tests/e2e/edge-cases/timing-edge.spec.ts` and `tests/e2e/edge-cases/concurrent-events.spec.ts`

### Requirement 13: Complete Animation Tests

**User Story:** As a developer, I want animation tests, so that landing feedback is validated.

#### Acceptance Criteria

1. WHEN duck lands, THE Test_Suite SHALL verify squish animation is triggered
2. WHEN squish is applied, THE Test_Suite SHALL verify scaleY decreases and scaleX increases
3. WHEN squish recovers, THE Test_Suite SHALL verify scales return to 1.0 over time
4. THE Test_Suite SHALL create `tests/e2e/visual/animations.spec.ts` with these tests

### Requirement 14: Complete PWA Tests

**User Story:** As a developer, I want PWA tests, so that progressive web app functionality is validated.

#### Acceptance Criteria

1. WHEN page loads, THE Test_Suite SHALL verify manifest link exists
2. WHEN page loads, THE Test_Suite SHALL verify theme-color meta tag is set
3. WHEN page loads, THE Test_Suite SHALL verify viewport meta tag is configured
4. THE Test_Suite SHALL create `tests/e2e/pwa/manifest.spec.ts` with these tests

### Requirement 15: Ensure Test Suite Stability

**User Story:** As a developer, I want all E2E tests to pass reliably, so that CI builds are stable.

#### Acceptance Criteria

1. WHEN all fixes are applied, THE Test_Suite SHALL pass all AI-controlled tests within 30 seconds each
2. WHEN all fixes are applied, THE Test_Suite SHALL pass all perfect landing tests without flakiness
3. WHEN all fixes are applied, THE Test_Suite SHALL pass all collision tests without unexpected game overs
4. WHEN all fixes are applied, THE Test_Suite SHALL pass all drag bounds tests with consistent clamping
5. WHEN running `pnpm test:e2e --project=chromium`, THE Test_Suite SHALL complete without hanging tests
6. THE Test_Suite SHALL achieve 100% pass rate on all implemented tests
