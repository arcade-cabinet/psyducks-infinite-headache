# Implementation Plan: Comprehensive E2E Testing

## Overview

This implementation plan creates a comprehensive E2E test suite for Psyduck's Infinite Headache using Playwright. The tests are organized into focused spec files covering collision detection, boundary conditions, input methods, state transitions, game mechanics, and cross-platform compatibility.

## Tasks

- [x] 1. Extend test helpers module
  - [x] 1.1 Add collision helper functions to helpers.ts
    - Add `positionDuckOverStack(page, offsetFromCenter)` function
    - Add `dropAndWaitForResult(page, previousScore, timeout)` function
    - Add `calculateTargetY(page)` function
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Add boundary helper functions to helpers.ts
    - Add `moveDuckToEdge(page, direction)` function
    - Add `verifyDuckBounds(page)` function
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 1.3 Add state helper functions to helpers.ts
    - Add `waitForGameMode(page, mode)` function
    - Add `triggerGameOver(page)` function
    - Add `triggerMerge(page)` function (via state manipulation)
    - Add `triggerLevelUp(page)` function (via state manipulation)
    - _Requirements: 4.1, 4.2, 4.4, 5.1_
  
  - [x] 1.4 Add coordinate conversion helpers to helpers.ts
    - Add `designToScreen(page, designX, designY)` function
    - Add `screenToDesign(page, screenX, screenY)` function
    - _Requirements: 3.4, 3.7_

- [x] 2. Checkpoint - Verify helpers work
  - Ensure all helper functions compile and basic tests pass, ask the user if questions arise.

- [x] 3. Implement collision detection tests
  - [x] 3.1 Create tests/e2e/collision/swept-collision.spec.ts
    - Test duck landing when prevY above targetY and y crosses below
    - Test collision uses topmost duck position
    - **Property 1: Swept Collision Landing Success**
    - **Validates: Requirements 1.1, 1.6**
  
  - [x] 3.2 Create tests/e2e/collision/perfect-landing.spec.ts
    - Test x-position snaps within perfectTolerance (8px)
    - Test perfect landing triggers particles
    - **Property 3: Perfect Landing Snap**
    - **Property 53: Perfect Landing Particles**
    - **Validates: Requirements 1.3, 19.1**
  
  - [x] 3.3 Create tests/e2e/collision/miss-detection.spec.ts
    - Test game over when x outside hitTolerance
    - Test fallback game over at baseY + cameraY + 400
    - **Property 2: Collision Miss Detection**
    - **Validates: Requirements 1.2, 1.5**
  
  - [x] 3.4 Create tests/e2e/collision/scaled-collision.spec.ts
    - Test collision zone scales with grown duck width
    - **Property 4: Collision Zone Scaling**
    - **Validates: Requirements 1.7, 5.8**

- [x] 4. Implement boundary tests
  - [x] 4.1 Create tests/e2e/boundaries/keyboard-bounds.spec.ts
    - Test ArrowLeft clamping to halfWidth
    - Test ArrowRight clamping to width - halfWidth
    - **Property 5: Keyboard Boundary Clamping**
    - **Validates: Requirements 2.1, 2.2**
  
  - [x] 4.2 Create tests/e2e/boundaries/drag-bounds.spec.ts
    - Test drag left boundary clamping
    - Test drag right boundary clamping
    - **Property 6: Drag Boundary Clamping**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 4.3 Create tests/e2e/boundaries/spawn-bounds.spec.ts
    - Test spawn position within valid range for multiple seeds
    - **Property 7: Spawn Position Bounds**
    - **Validates: Requirements 2.6**

- [x] 5. Checkpoint - Verify collision and boundary tests
  - Ensure all collision and boundary tests pass, ask the user if questions arise.

- [x] 6. Implement input method tests
  - [x] 6.1 Create tests/e2e/inputs/keyboard.spec.ts
    - Test Space key triggers drop
    - Test ArrowLeft/Right movement amount (15px)
    - **Property 8: Space Key Drop Trigger**
    - **Property 9: Arrow Key Movement Amount**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [x] 6.2 Create tests/e2e/inputs/mouse.spec.ts
    - Test click on duck initiates drag
    - Test click away from duck triggers drop
    - Test drag release triggers drop
    - **Property 10: Click-on-Duck Drag Initiation**
    - **Property 11: Click-Away Drop Trigger**
    - **Property 12: Drag Release Drop**
    - **Validates: Requirements 3.4, 3.5, 3.6**
  
  - [x] 6.3 Create tests/e2e/inputs/touch.spec.ts
    - Test touch start initiates drag with identifier
    - Test touch move updates position
    - Test touch end triggers drop
    - Test touch cancel handles gracefully
    - **Property 13: Touch Drag State**
    - **Validates: Requirements 3.7, 3.8, 3.9, 3.10**
  
  - [x] 6.4 Create tests/e2e/inputs/multi-input.spec.ts
    - Test keyboard then mouse sequence
    - Test rapid input handling
    - **Property 46: Rapid Input State Consistency**
    - **Validates: Requirements 3.12, 15.2**

- [x] 7. Implement state transition tests
  - [x] 7.1 Create tests/e2e/states/game-modes.spec.ts
    - Test MENU to PLAYING transition
    - Test PLAYING to GAMEOVER on miss
    - Test PLAYING to LEVELUP on threshold
    - Test LEVELUP to PLAYING on continue
    - Test GAMEOVER to PLAYING on retry
    - **Property 14: Menu to Playing Transition**
    - **Property 15: Miss to GameOver Transition**
    - **Property 16: Level Up Threshold Transition**
    - **Property 17: Continue to Playing Transition**
    - **Property 18: Retry Seed Preservation**
    - **Validates: Requirements 4.1, 4.2, 4.4, 4.5, 4.6, 4.7**
  
  - [x] 7.2 Create tests/e2e/states/duck-states.spec.ts
    - Test initial spawn state (isFalling=false, isStatic=false)
    - Test drag state (isBeingDragged=true)
    - Test falling state after drop
    - Test landed state (isStatic=true)
    - **Property 49: Duck Initial State**
    - **Property 50: Duck Drag State**
    - **Property 51: Duck Landed State**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6**
  
  - [x] 7.3 Create tests/e2e/states/ui-states.spec.ts
    - Test no spawn in GAMEOVER mode
    - Test no spawn in LEVELUP mode
    - **Property 19: No Spawn in Non-Playing Modes**
    - **Validates: Requirements 4.8, 4.9**

- [x] 8. Checkpoint - Verify input and state tests
  - Ensure all input and state tests pass, ask the user if questions arise.

- [-] 9. Implement game mechanics tests
  - [x] 9.1 Create tests/e2e/mechanics/merge.spec.ts
    - Test merge triggers at mergeCount=5
    - Test 5 ducks removed from array
    - Test mergeLevel increments
    - Test mergeCount resets to 0
    - Test growth calculation matches formula
    - Test particles spawn on merge
    - **Property 20: Merge Trigger at Threshold**
    - **Property 21: Merge Growth Calculation**
    - **Property 22: Merge Particle Spawn**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**
  
  - [x] 9.2 Create tests/e2e/mechanics/levelup.spec.ts
    - Test level up at 80% screen width
    - Test level up screen displays
    - Test new level config colors apply
    - Test difficulty scaling (spawn interval, wobble, auto-drop)
    - **Property 23: Level Up Screen Display**
    - **Property 24: Difficulty Scaling with Level**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8**
  
  - [-] 9.3 Create tests/e2e/mechanics/wobble.spec.ts
    - Test wobble impulse on landing
    - Test imbalance increases instability
    - Test stability bar reflects state
    - Test critical/warning CSS classes
    - **Property 25: Wobble Impulse on Landing**
    - **Property 26: Imbalance Increases Instability**
    - **Property 27: Stability Bar Reflects State**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**
  
  - [ ] 9.4 Create tests/e2e/mechanics/autodrop.spec.ts
    - Test auto-drop timer starts on spawn
    - Test auto-drop triggers falling
    - Test manual drop clears timer
    - Test auto-drop time formula with level
    - **Property 28: Auto-Drop Timer Behavior**
    - **Property 29: Manual Drop Clears Timer**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**
  
  - [ ] 9.5 Create tests/e2e/mechanics/camera.spec.ts
    - Test targetCameraY updates on landing
    - Test cameraY smooth interpolation
    - Test camera keeps top duck at ~70% height
    - Test camera resets on restart
    - **Property 34: Camera Target Update on Landing**
    - **Property 35: Camera Smooth Interpolation**
    - **Property 36: Camera Reset on Restart**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
  
  - [ ] 9.6 Create tests/e2e/mechanics/particles.spec.ts
    - Test particle cleanup when life <= 0
    - **Property 47: Particle Lifecycle**
    - **Validates: Requirements 16.2, 19.3**

- [ ] 10. Checkpoint - Verify mechanics tests
  - Ensure all mechanics tests pass, ask the user if questions arise.

- [ ] 11. Implement seeded randomness tests
  - [ ] 11.1 Create tests/e2e/seeded/reproducibility.spec.ts
    - Test same seed produces identical spawn positions
    - Test same seed produces identical level configs
    - **Property 30: Seed Reproducibility**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ] 11.2 Create tests/e2e/seeded/seed-ui.spec.ts
    - Test seed input is used by game
    - Test shuffle generates new seed
    - Test game over displays correct seed
    - Test copy seed to clipboard
    - **Property 31: Seed Input Usage**
    - **Property 32: Shuffle Generates New Seed**
    - **Property 33: Game Over Seed Display**
    - **Validates: Requirements 9.3, 9.4, 9.5, 9.7**

- [ ] 12. Implement responsive scaling tests
  - [ ] 12.1 Create tests/e2e/responsive/scaling.spec.ts
    - Test designWidth clamping to [412, 800]
    - Test scale factor calculation
    - Test canvas physical resolution
    - Test gameOffsetX is always 0
    - **Property 37: Design Width Clamping**
    - **Property 38: Scale Factor Calculation**
    - **Property 39: Canvas Physical Resolution**
    - **Property 40: GameOffsetX Invariant**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**

- [ ] 13. Implement UI element tests
  - [ ] 13.1 Create tests/e2e/ui/score-display.spec.ts
    - Test score shows 0 on start
    - Test score updates on landing
    - Test high score persistence
    - **Property 41: Score Display Updates**
    - **Property 42: High Score Persistence**
    - **Validates: Requirements 12.1, 12.2, 12.3**
  
  - [ ] 13.2 Create tests/e2e/ui/screens.spec.ts
    - Test help screen toggle
    - Test game over screen display
    - Test level up screen display
    - **Property 43: Help Screen Toggle**
    - **Property 44: Game Over Screen Display**
    - **Validates: Requirements 12.4, 12.5, 12.6**

- [ ] 14. Implement visual rendering tests
  - [ ] 14.1 Create tests/e2e/visual/rendering.spec.ts
    - Test canvas not all-black during play
    - Test no black screen on retry
    - **Property 45: Canvas Rendering Verification**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**

- [ ] 15. Implement edge case tests
  - [ ] 15.1 Create tests/e2e/edge-cases/timing-edge.spec.ts
    - Test spawn timing after landing
    - Test animation completion
    - **Property 48: Spawn Timing**
    - **Validates: Requirements 16.3, 16.4**
  
  - [ ] 15.2 Create tests/e2e/edge-cases/concurrent-events.spec.ts
    - Test merge at level up threshold
    - Test game over during spawn
    - Test clipboard copy failure handling
    - **Validates: Requirements 15.5, 15.6, 15.7**

- [ ] 16. Implement animation tests
  - [ ] 16.1 Create tests/e2e/visual/animations.spec.ts
    - Test squish animation on landing
    - Test scale recovery to 1.0
    - **Property 52: Squish Animation on Landing**
    - **Validates: Requirements 18.1, 18.2, 18.3**

- [ ] 17. Checkpoint - Verify all feature tests
  - Ensure all feature tests pass, ask the user if questions arise.

- [ ] 18. Implement cross-platform tests
  - [ ] 18.1 Create tests/e2e/platform/chromium.spec.ts
    - Test core mechanics on Chromium
    - **Property 54: Cross-Browser Core Mechanics**
    - **Validates: Requirements 20.1**
  
  - [ ] 18.2 Create tests/e2e/platform/firefox.spec.ts
    - Test core mechanics on Firefox with timing adjustments
    - **Property 54: Cross-Browser Core Mechanics**
    - **Validates: Requirements 20.2**
  
  - [ ] 18.3 Create tests/e2e/platform/webkit.spec.ts
    - Test core mechanics on WebKit
    - **Property 54: Cross-Browser Core Mechanics**
    - **Validates: Requirements 20.3**
  
  - [ ] 18.4 Create tests/e2e/platform/mobile.spec.ts
    - Test touch controls on mobile viewport
    - Test keyboard controls on desktop viewport
    - **Property 55: Platform-Specific Controls**
    - **Validates: Requirements 20.4, 20.5**

- [ ] 19. Implement PWA tests
  - [ ] 19.1 Create tests/e2e/pwa/manifest.spec.ts
    - Test manifest link exists
    - Test theme-color meta tag
    - Test viewport meta tag
    - **Validates: Requirements 13.1, 13.2, 13.3**

- [ ] 20. Final checkpoint - Full test suite verification
  - Run complete test suite across all browsers
  - Verify all 55 properties are covered
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tests marked with property numbers reference the design document correctness properties
- Each test file should include the property tag comment for traceability
- Firefox tests may need timing adjustments due to slower rAF in headless mode
- Mobile tests skip keyboard-only scenarios
- Property tests should run minimum 100 iterations where applicable (via repeatEach config)
