# Implementation Plan: Complete Game Stabilization

## Overview

This implementation plan fixes all failing E2E tests and completes missing test coverage for Psyduck's Infinite Headache. The approach prioritizes fixing existing failures before implementing new tests, ensuring incremental progress and validation.

## Tasks

- [x] 1. Fix AI-Controlled Test Failures
  - [x] 1.1 Update AI test wait conditions
    - Replace any remaining `page.waitForFunction` with `waitForDuckLandingResult`
    - Ensure all AI tests use consistent 30-second timeout
    - Add diagnostic output for stuck duck states
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 1.2 Write property test for stuck duck detection
    - **Property 1: Stuck Duck Detection**
    - **Validates: Requirements 1.5**

- [ ] 2. Fix Perfect Landing Test Failures
  - [x] 2.1 Update particle detection in perfect-landing.spec.ts
    - Add `clearParticles` helper call before each test
    - Use immediate particle count check after landing (within 100ms)
    - Add retry logic with extended wait if initial detection fails
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [x] 2.2 Fix duck positioning for perfect landing tests
    - Use direct state manipulation when arrow keys cannot achieve perfectTolerance
    - Verify duck is within tolerance before dropping
    - _Requirements: 2.3_
  
  - [x] 2.3 Write property test for perfect landing particle spawn
    - **Property 2: Perfect Landing Particle Spawn**
    - **Validates: Requirements 2.1, 2.2**
  
  - [-] 2.4 Write property test for combined perfect landing behavior
    - **Property 3: Perfect Landing Combined Behavior**
    - **Validates: Requirements 2.4**

- [ ] 3. Fix Collision Detection Test Failures
  - [~] 3.1 Update swept-collision.spec.ts
    - Verify prevY tracking is correct before drop
    - Add diagnostic output for unexpected game overs
    - Use consistent seed for reproducible scenarios
    - _Requirements: 3.1_
  
  - [~] 3.2 Update scaled-collision.spec.ts
    - Add wait after duck width manipulation before dropping
    - Verify collision zone calculation matches formula
    - _Requirements: 3.2_
  
  - [~] 3.3 Write property test for swept collision detection
    - **Property 4: Swept Collision Detection**
    - **Validates: Requirements 3.1**
  
  - [~] 3.4 Write property test for scaled collision zone
    - **Property 5: Scaled Collision Zone**
    - **Validates: Requirements 3.2**

- [ ] 4. Fix Drag Bounds Test Failures
  - [~] 4.1 Update drag-bounds.spec.ts
    - Increase drag steps and delays for reliable position updates
    - Verify drag state is active before asserting position
    - Use dynamic bounds calculation based on current duck width
    - _Requirements: 4.1, 4.4_
  
  - [~] 4.2 Write property test for drag boundary clamping
    - **Property 6: Drag Boundary Clamping**
    - **Validates: Requirements 4.1, 4.4**

- [~] 5. Checkpoint - Verify all failing tests are fixed
  - Run `pnpm test:e2e --project=chromium` on collision, boundaries, and ai-controlled tests
  - Ensure all previously failing tests now pass
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 6. Add helper functions for new tests
  - [~] 6.1 Add auto-drop timer helpers to helpers.ts
    - Add `waitForAutoDropTrigger(page, timeout)` function
    - Add `getAutoDropTimeRemaining(page)` function
    - _Requirements: 5.1, 5.2_
  
  - [~] 6.2 Add camera helpers to helpers.ts
    - Add `getCameraState(page)` function returning cameraY and targetCameraY
    - Add `waitForCameraStabilize(page, timeout)` function
    - _Requirements: 6.1, 6.2_
  
  - [~] 6.3 Add particle helpers to helpers.ts
    - Add `getParticleCount(page)` function
    - Add `clearParticles(page)` function
    - Add `getParticlePositions(page)` function
    - _Requirements: 7.1, 7.3_

- [ ] 7. Implement auto-drop timer tests
  - [~] 7.1 Create tests/e2e/mechanics/autodrop.spec.ts
    - Test auto-drop timer starts on spawn
    - Test auto-drop triggers falling state
    - Test manual drop clears timer
    - Test timer decreases by 200ms per level
    - Test timer clamps to 1500ms minimum
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [~] 7.2 Write property test for auto-drop timer behavior
    - **Property 7: Auto-Drop Timer Behavior**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 8. Implement camera system tests
  - [~] 8.1 Create tests/e2e/mechanics/camera.spec.ts
    - Test targetCameraY updates on landing
    - Test cameraY interpolates toward target
    - Test top duck stays at ~70% screen height for tall stacks
    - Test camera resets to 0 on restart
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [~] 8.2 Write property test for camera system behavior
    - **Property 8: Camera System Behavior**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 9. Implement particle system tests
  - [~] 9.1 Create tests/e2e/mechanics/particles.spec.ts
    - Test particle removal when life <= 0
    - Test bulk particle cleanup
    - Test 20 particles spawn on perfect landing
    - Test particles spawn at base duck on merge
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [~] 9.2 Write property test for particle lifecycle
    - **Property 9: Particle Lifecycle**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [~] 10. Checkpoint - Verify mechanics tests pass
  - Run `pnpm test:e2e tests/e2e/mechanics/ --project=chromium`
  - Ensure all mechanics tests pass
  - _Requirements: 15.5_

- [ ] 11. Implement seeded randomness tests
  - [~] 11.1 Create tests/e2e/seeded/reproducibility.spec.ts
    - Test same seed produces identical spawn positions
    - Test same seed produces identical level configs
    - _Requirements: 8.1, 8.2_
  
  - [~] 11.2 Create tests/e2e/seeded/seed-ui.spec.ts
    - Test seed input is used by game
    - Test shuffle generates new seed
    - Test game over displays correct seed
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [~] 11.3 Write property test for seed reproducibility
    - **Property 10: Seed Reproducibility**
    - **Validates: Requirements 8.1, 8.2**
  
  - [~] 11.4 Write property test for seed UI behavior
    - **Property 11: Seed UI Behavior**
    - **Validates: Requirements 8.3, 8.4, 8.5**

- [ ] 12. Implement responsive scaling tests
  - [~] 12.1 Create tests/e2e/responsive/scaling.spec.ts
    - Test designWidth clamped to 412 for narrow viewports
    - Test designWidth equals viewport for 412-800px range
    - Test designWidth capped at 800 for wide viewports
    - Test scale factor updates on resize
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [~] 12.2 Write property test for responsive scaling
    - **Property 12: Responsive Scaling**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 13. Implement UI element tests
  - [~] 13.1 Create tests/e2e/ui/score-display.spec.ts
    - Test score shows 0 on start
    - Test score updates on landing
    - Test high score updates localStorage
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [~] 13.2 Create tests/e2e/ui/screens.spec.ts
    - Test help screen toggle
    - Test game over screen display
    - Test level up screen display
    - _Requirements: 10.4_
  
  - [~] 13.3 Write property test for score display updates
    - **Property 13: Score Display Updates**
    - **Validates: Requirements 10.2, 10.3**

- [ ] 14. Implement visual rendering tests
  - [~] 14.1 Create tests/e2e/visual/rendering.spec.ts
    - Test canvas not all-black during play
    - Test no black screen on retry
    - Test level colors are applied
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [~] 14.2 Write property test for canvas rendering
    - **Property 14: Canvas Rendering**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [~] 15. Checkpoint - Verify feature tests pass
  - Run `pnpm test:e2e tests/e2e/seeded/ tests/e2e/responsive/ tests/e2e/ui/ tests/e2e/visual/ --project=chromium`
  - Ensure all feature tests pass
  - _Requirements: 15.5_

- [ ] 16. Implement edge case tests
  - [~] 16.1 Create tests/e2e/edge-cases/timing-edge.spec.ts
    - Test spawn timing after landing
    - Test animation completion
    - _Requirements: 12.1_
  
  - [~] 16.2 Create tests/e2e/edge-cases/concurrent-events.spec.ts
    - Test merge at level up threshold
    - Test clipboard copy failure handling
    - _Requirements: 12.2, 12.3_
  
  - [~] 16.3 Write property test for spawn timing
    - **Property 15: Spawn Timing**
    - **Validates: Requirements 12.1**

- [ ] 17. Implement animation tests
  - [~] 17.1 Create tests/e2e/visual/animations.spec.ts
    - Test squish animation triggers on landing
    - Test scaleY decreases and scaleX increases during squish
    - Test scales recover to 1.0 over time
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [~] 17.2 Write property test for squish animation
    - **Property 16: Squish Animation**
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ] 18. Implement PWA tests
  - [~] 18.1 Create tests/e2e/pwa/manifest.spec.ts
    - Test manifest link exists
    - Test theme-color meta tag is set
    - Test viewport meta tag is configured
    - _Requirements: 14.1, 14.2, 14.3_

- [~] 19. Final checkpoint - Full test suite verification
  - Run `pnpm test:e2e --project=chromium`
  - Verify all tests pass without hanging
  - Verify 100% pass rate on all implemented tests
  - _Requirements: 15.5, 15.6_

## Notes

- All tasks are required for comprehensive test coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Firefox tests may need timing adjustments due to slower rAF in headless mode
- Mobile tests skip keyboard-only scenarios
