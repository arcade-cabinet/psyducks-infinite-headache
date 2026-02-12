# Requirements Document

## Introduction

This document specifies comprehensive end-to-end testing requirements for Psyduck's Infinite Headache, a canvas-based stacking game PWA. The goal is exhaustive coverage of every collision opportunity, boundary condition, game mechanic, input method, state transition, and edge case to ensure game correctness and reliability across all platforms and scenarios.

## Glossary

- **Test_Suite**: The complete Playwright E2E test collection
- **Game_State**: The exposed `window.__gameState` object containing all runtime game data
- **Duck**: A game entity that can be falling, hovering, static, or being dragged
- **Base_Duck**: The first duck in the stack (index 0) that grows on merge
- **Current_Duck**: The actively controlled duck awaiting drop or being positioned
- **Stack**: The collection of landed ducks on top of the base duck
- **Collision_Zone**: The area defined by `topDuck.w * CONFIG.hitTolerance` where landing succeeds
- **Perfect_Zone**: The area defined by `CONFIG.perfectTolerance` (8px) for perfect landing bonus
- **Swept_Collision**: Collision detection using prevY/y to detect crossing targetY threshold
- **Wobble_Physics**: Tower instability simulation based on stack height and imbalance
- **Merge**: Combining 5 stacked ducks into base duck growth
- **Level_Up**: Triggered when base duck width reaches 80% of screen width
- **Auto_Drop**: Timer-based automatic duck drop after timeout
- **Design_Space**: Coordinate system scaled from viewport (412-800px width range)
- **Seeded_RNG**: Deterministic random number generator for reproducible gameplay

## Requirements

### Requirement 1: Collision Detection Coverage

**User Story:** As a QA engineer, I want comprehensive collision detection tests, so that I can verify all landing and miss scenarios work correctly.

#### Acceptance Criteria

1. WHEN a falling duck's prevY is above targetY AND y crosses below targetY AND x is within hitTolerance, THEN the Test_Suite SHALL verify the duck lands successfully
2. WHEN a falling duck crosses targetY AND x is outside hitTolerance, THEN the Test_Suite SHALL verify game over triggers
3. WHEN a falling duck lands within perfectTolerance (8px) of center, THEN the Test_Suite SHALL verify x-position snaps to base duck center
4. WHEN a falling duck lands at exactly the hitTolerance boundary, THEN the Test_Suite SHALL verify the edge case behavior (land or miss)
5. WHEN a falling duck falls past baseY + cameraY + 400 without collision, THEN the Test_Suite SHALL verify the fallback game over triggers
6. WHEN multiple ducks are stacked, THEN the Test_Suite SHALL verify collision detection uses the topmost duck's position
7. WHEN the base duck has grown via merges, THEN the Test_Suite SHALL verify collision zone scales with duck width

### Requirement 2: Boundary and Bounds Testing

**User Story:** As a QA engineer, I want exhaustive boundary tests, so that I can verify ducks cannot escape valid game areas.

#### Acceptance Criteria

1. WHEN a duck is moved via ArrowRight to the right edge, THEN the Test_Suite SHALL verify x is clamped to `width - halfWidth`
2. WHEN a duck is moved via ArrowLeft to the left edge, THEN the Test_Suite SHALL verify x is clamped to `halfWidth`
3. WHEN a duck is dragged beyond the right canvas boundary, THEN the Test_Suite SHALL verify x is clamped to valid range
4. WHEN a duck is dragged beyond the left canvas boundary, THEN the Test_Suite SHALL verify x is clamped to valid range
5. WHEN gyroscope tilt pushes duck toward boundaries, THEN the Test_Suite SHALL verify x remains within valid bounds
6. WHEN spawn position is generated, THEN the Test_Suite SHALL verify x is within `[duckBaseWidth, width - duckBaseWidth]`
7. WHEN viewport is resized during gameplay, THEN the Test_Suite SHALL verify game bounds update correctly

### Requirement 3: Input Method Coverage

**User Story:** As a QA engineer, I want tests for all input methods, so that I can verify keyboard, mouse, touch, and gyroscope controls work correctly.

#### Acceptance Criteria

1. WHEN Space key is pressed during hover phase, THEN the Test_Suite SHALL verify duck transitions to falling state
2. WHEN ArrowLeft is pressed, THEN the Test_Suite SHALL verify duck moves left by ARROW_MOVE_PX (15px)
3. WHEN ArrowRight is pressed, THEN the Test_Suite SHALL verify duck moves right by ARROW_MOVE_PX (15px)
4. WHEN mouse clicks on duck during hover, THEN the Test_Suite SHALL verify drag mode initiates
5. WHEN mouse clicks away from duck during hover, THEN the Test_Suite SHALL verify duck drops
6. WHEN mouse drag is released, THEN the Test_Suite SHALL verify duck transitions to falling
7. WHEN touch starts on duck, THEN the Test_Suite SHALL verify drag mode initiates with correct touch identifier
8. WHEN touch moves during drag, THEN the Test_Suite SHALL verify duck position updates
9. WHEN touch ends during drag, THEN the Test_Suite SHALL verify duck drops
10. WHEN touch is cancelled, THEN the Test_Suite SHALL verify drag ends gracefully
11. WHEN gyroscope is active, THEN the Test_Suite SHALL verify tiltX affects duck position proportionally
12. WHEN multiple input methods are used in sequence, THEN the Test_Suite SHALL verify no state corruption

### Requirement 4: Game State Transitions

**User Story:** As a QA engineer, I want tests for all state transitions, so that I can verify the game mode machine works correctly.

#### Acceptance Criteria

1. WHEN game starts from MENU, THEN the Test_Suite SHALL verify transition to PLAYING mode
2. WHEN duck misses stack, THEN the Test_Suite SHALL verify transition to GAMEOVER mode
3. WHEN wobble becomes critically unstable, THEN the Test_Suite SHALL verify transition to GAMEOVER mode
4. WHEN base duck reaches 80% screen width, THEN the Test_Suite SHALL verify transition to LEVELUP mode
5. WHEN continue button is clicked in LEVELUP, THEN the Test_Suite SHALL verify transition back to PLAYING
6. WHEN retry button is clicked in GAMEOVER, THEN the Test_Suite SHALL verify transition to PLAYING with same seed
7. WHEN play button is clicked in MENU, THEN the Test_Suite SHALL verify start screen hides and score box shows
8. IF game is in GAMEOVER mode, THEN the Test_Suite SHALL verify no duck spawning occurs
9. IF game is in LEVELUP mode, THEN the Test_Suite SHALL verify no duck spawning occurs

### Requirement 5: Merge Mechanics Testing

**User Story:** As a QA engineer, I want comprehensive merge tests, so that I can verify the 5-duck merge system works correctly.

#### Acceptance Criteria

1. WHEN mergeCount reaches 5, THEN the Test_Suite SHALL verify merge triggers
2. WHEN merge triggers, THEN the Test_Suite SHALL verify 5 stacked ducks are removed from array
3. WHEN merge triggers, THEN the Test_Suite SHALL verify base duck mergeLevel increments
4. WHEN merge triggers, THEN the Test_Suite SHALL verify base duck width grows by computed growth rate
5. WHEN merge triggers, THEN the Test_Suite SHALL verify mergeCount resets to 0
6. WHEN merge triggers, THEN the Test_Suite SHALL verify particles spawn at base duck position
7. WHEN mergeCount is 4 and duck lands, THEN the Test_Suite SHALL verify mergeCount becomes 5 and merge fires
8. WHEN base duck has grown, THEN the Test_Suite SHALL verify collision zone expands proportionally

### Requirement 6: Level Up System Testing

**User Story:** As a QA engineer, I want level up tests, so that I can verify progression mechanics work correctly.

#### Acceptance Criteria

1. WHEN base duck width >= width * 0.8, THEN the Test_Suite SHALL verify level up triggers
2. WHEN level up triggers, THEN the Test_Suite SHALL verify level increments
3. WHEN level up triggers, THEN the Test_Suite SHALL verify level up screen displays
4. WHEN level up triggers, THEN the Test_Suite SHALL verify new level config colors apply
5. WHEN continue is clicked after level up, THEN the Test_Suite SHALL verify base duck resets to base size
6. WHEN level increases, THEN the Test_Suite SHALL verify spawn interval decreases
7. WHEN level increases, THEN the Test_Suite SHALL verify wobble multiplier increases
8. WHEN level increases, THEN the Test_Suite SHALL verify auto-drop timer decreases

### Requirement 7: Wobble Physics Testing

**User Story:** As a QA engineer, I want wobble physics tests, so that I can verify tower stability mechanics work correctly.

#### Acceptance Criteria

1. WHEN duck lands, THEN the Test_Suite SHALL verify wobble impulse is added
2. WHEN stack is imbalanced, THEN the Test_Suite SHALL verify wobble instability increases
3. WHEN wobble angle exceeds maxAngle * 0.9, THEN the Test_Suite SHALL verify critical instability state
4. WHEN wobble angle exceeds maxAngle * 0.95, THEN the Test_Suite SHALL verify game over triggers
5. WHEN center of mass is offset, THEN the Test_Suite SHALL verify wobble force is applied
6. WHEN stability bar updates, THEN the Test_Suite SHALL verify width reflects stability percentage
7. WHEN stability drops below 30%, THEN the Test_Suite SHALL verify critical CSS class applies
8. WHEN stability is between 30-60%, THEN the Test_Suite SHALL verify warning CSS class applies

### Requirement 8: Auto-Drop Timer Testing

**User Story:** As a QA engineer, I want auto-drop timer tests, so that I can verify time pressure mechanics work correctly.

#### Acceptance Criteria

1. WHEN duck spawns, THEN the Test_Suite SHALL verify auto-drop timer starts
2. WHEN auto-drop timer expires, THEN the Test_Suite SHALL verify duck transitions to falling
3. WHEN duck is manually dropped, THEN the Test_Suite SHALL verify auto-drop timer is cleared
4. WHEN duck is dragged and released, THEN the Test_Suite SHALL verify auto-drop timer is cleared
5. WHEN level increases, THEN the Test_Suite SHALL verify auto-drop time decreases by 200ms per level
6. WHEN auto-drop time would go below 1500ms, THEN the Test_Suite SHALL verify it clamps to 1500ms

### Requirement 9: Seeded Randomness Testing

**User Story:** As a QA engineer, I want seeded randomness tests, so that I can verify reproducible gameplay works correctly.

#### Acceptance Criteria

1. WHEN same seed is used twice, THEN the Test_Suite SHALL verify identical spawn positions
2. WHEN same seed is used twice, THEN the Test_Suite SHALL verify identical level configs
3. WHEN seed is entered in input, THEN the Test_Suite SHALL verify game uses that seed
4. WHEN shuffle button is clicked, THEN the Test_Suite SHALL verify new seed is generated
5. WHEN game over shows seed, THEN the Test_Suite SHALL verify it matches active game seed
6. WHEN retry is clicked, THEN the Test_Suite SHALL verify same seed is reused
7. WHEN copy seed button is clicked, THEN the Test_Suite SHALL verify seed is copied to clipboard

### Requirement 10: Camera System Testing

**User Story:** As a QA engineer, I want camera tests, so that I can verify the view follows the stack correctly.

#### Acceptance Criteria

1. WHEN duck lands, THEN the Test_Suite SHALL verify targetCameraY updates
2. WHEN targetCameraY changes, THEN the Test_Suite SHALL verify cameraY smoothly interpolates
3. WHEN stack grows tall, THEN the Test_Suite SHALL verify camera keeps top duck at ~70% screen height
4. WHEN game restarts, THEN the Test_Suite SHALL verify camera resets to 0

### Requirement 11: Responsive Scaling Testing

**User Story:** As a QA engineer, I want responsive scaling tests, so that I can verify the game works across all viewport sizes.

#### Acceptance Criteria

1. WHEN viewport width < 412px, THEN the Test_Suite SHALL verify designWidth is 412
2. WHEN viewport width is between 412-800px, THEN the Test_Suite SHALL verify designWidth equals viewport width
3. WHEN viewport width > 800px, THEN the Test_Suite SHALL verify designWidth is capped at 800
4. WHEN viewport is resized, THEN the Test_Suite SHALL verify scale factor updates correctly
5. WHEN canvas renders, THEN the Test_Suite SHALL verify physical resolution is viewport * dpr
6. WHEN gameOffsetX is checked, THEN the Test_Suite SHALL verify it is always 0

### Requirement 12: UI Element Testing

**User Story:** As a QA engineer, I want UI element tests, so that I can verify all interface components work correctly.

#### Acceptance Criteria

1. WHEN game starts, THEN the Test_Suite SHALL verify score display shows 0
2. WHEN duck lands, THEN the Test_Suite SHALL verify score display updates
3. WHEN high score is beaten, THEN the Test_Suite SHALL verify localStorage updates
4. WHEN help button is clicked, THEN the Test_Suite SHALL verify help screen shows
5. WHEN help close button is clicked, THEN the Test_Suite SHALL verify help screen hides
6. WHEN game over occurs, THEN the Test_Suite SHALL verify game over screen shows with correct data
7. WHEN level up occurs, THEN the Test_Suite SHALL verify level up screen shows with level name

### Requirement 13: PWA and Offline Testing

**User Story:** As a QA engineer, I want PWA tests, so that I can verify the app works as a progressive web app.

#### Acceptance Criteria

1. WHEN page loads, THEN the Test_Suite SHALL verify manifest link exists
2. WHEN page loads, THEN the Test_Suite SHALL verify theme-color meta tag is set
3. WHEN page loads, THEN the Test_Suite SHALL verify viewport meta tag is configured
4. WHEN service worker registers, THEN the Test_Suite SHALL verify it activates successfully

### Requirement 14: Visual Rendering Testing

**User Story:** As a QA engineer, I want visual rendering tests, so that I can verify the canvas renders correctly.

#### Acceptance Criteria

1. WHEN game is playing, THEN the Test_Suite SHALL verify canvas is not all-black
2. WHEN retry is clicked, THEN the Test_Suite SHALL verify no black screen appears
3. WHEN background renders, THEN the Test_Suite SHALL verify level colors are applied
4. WHEN duck renders, THEN the Test_Suite SHALL verify correct dimensions and position

### Requirement 15: Edge Case and Error Handling Testing

**User Story:** As a QA engineer, I want edge case tests, so that I can verify the game handles unusual scenarios gracefully.

#### Acceptance Criteria

1. WHEN duck lands at exact boundary of hitTolerance, THEN the Test_Suite SHALL verify consistent behavior
2. WHEN multiple rapid inputs occur, THEN the Test_Suite SHALL verify no state corruption
3. WHEN browser tab loses focus during gameplay, THEN the Test_Suite SHALL verify game handles gracefully
4. WHEN very rapid successive drops occur, THEN the Test_Suite SHALL verify collision detection remains accurate
5. WHEN duck is at spawn position and game over triggers, THEN the Test_Suite SHALL verify clean state transition
6. WHEN merge triggers at exact moment of level up threshold, THEN the Test_Suite SHALL verify both events process correctly
7. WHEN clipboard copy fails, THEN the Test_Suite SHALL verify error is handled gracefully

### Requirement 16: Performance and Timing Testing

**User Story:** As a QA engineer, I want performance tests, so that I can verify the game runs smoothly under various conditions.

#### Acceptance Criteria

1. WHEN game loop runs, THEN the Test_Suite SHALL verify requestAnimationFrame is used
2. WHEN many particles exist, THEN the Test_Suite SHALL verify particles are cleaned up when life <= 0
3. WHEN spawn interval timer fires, THEN the Test_Suite SHALL verify new duck spawns at correct time
4. WHEN animations run, THEN the Test_Suite SHALL verify they complete without blocking

### Requirement 17: Duck State Machine Testing

**User Story:** As a QA engineer, I want duck state tests, so that I can verify individual duck state transitions work correctly.

#### Acceptance Criteria

1. WHEN duck spawns, THEN the Test_Suite SHALL verify isFalling=false, isStatic=false, isBeingDragged=false
2. WHEN duck is dragged, THEN the Test_Suite SHALL verify isBeingDragged=true, isFalling=false
3. WHEN drag ends, THEN the Test_Suite SHALL verify isBeingDragged=false, isFalling=true
4. WHEN duck lands, THEN the Test_Suite SHALL verify isStatic=true, isFalling=false
5. WHEN duck is dropped via Space, THEN the Test_Suite SHALL verify isFalling=true immediately
6. WHEN duck is dropped via click away, THEN the Test_Suite SHALL verify isFalling=true

### Requirement 18: Squish Animation Testing

**User Story:** As a QA engineer, I want squish animation tests, so that I can verify landing feedback works correctly.

#### Acceptance Criteria

1. WHEN duck lands, THEN the Test_Suite SHALL verify squish() is called
2. WHEN squish is applied, THEN the Test_Suite SHALL verify scaleY decreases and scaleX increases
3. WHEN squish recovers, THEN the Test_Suite SHALL verify scales return to 1.0 over time

### Requirement 19: Particle System Testing

**User Story:** As a QA engineer, I want particle tests, so that I can verify visual effects work correctly.

#### Acceptance Criteria

1. WHEN perfect landing occurs, THEN the Test_Suite SHALL verify particles spawn
2. WHEN merge occurs, THEN the Test_Suite SHALL verify particles spawn at base duck
3. WHEN particle life reaches 0, THEN the Test_Suite SHALL verify particle is removed from array

### Requirement 20: Cross-Browser and Platform Testing

**User Story:** As a QA engineer, I want cross-platform tests, so that I can verify the game works on all target browsers and devices.

#### Acceptance Criteria

1. WHEN running on Chromium, THEN the Test_Suite SHALL verify all core mechanics work
2. WHEN running on Firefox, THEN the Test_Suite SHALL verify all core mechanics work (with timing adjustments)
3. WHEN running on WebKit, THEN the Test_Suite SHALL verify all core mechanics work
4. WHEN running on mobile viewport, THEN the Test_Suite SHALL verify touch controls work
5. WHEN running on desktop viewport, THEN the Test_Suite SHALL verify keyboard controls work
