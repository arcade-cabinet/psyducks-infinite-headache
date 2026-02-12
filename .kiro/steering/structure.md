# Project Structure

```
├── src/
│   ├── components/
│   │   └── PsyduckGame.astro    # Main game component (canvas + UI + game loop)
│   ├── layouts/
│   │   └── Layout.astro         # HTML shell with PWA meta tags
│   ├── pages/
│   │   └── index.astro          # Single page entry point
│   ├── scripts/
│   │   ├── game.ts              # Core game logic, Duck class, CONFIG, collision
│   │   ├── animations.ts        # anime.js animation helpers
│   │   ├── audio.ts             # Tone.js sound effects
│   │   ├── wobble.ts            # Tower physics simulation
│   │   ├── seededRandom.ts      # Deterministic RNG, seed generation
│   │   └── device.ts            # Input detection, haptics, gyroscope
│   └── styles/
│       └── global.css           # Global styles, CSS custom properties
├── public/
│   ├── icons/                   # PWA icons (SVG)
│   └── favicon.svg
├── tests/
│   ├── unit/                    # Vitest unit tests
│   │   └── game.test.ts
│   └── e2e/                     # Playwright E2E tests
│       ├── game.spec.ts         # Core gameplay tests
│       ├── collision-physics.spec.ts
│       ├── hover-controls.spec.ts
│       ├── merge-levelup.spec.ts
│       ├── design-tokens.spec.ts
│       ├── visual-gameplay.spec.ts
│       ├── ai-controlled.spec.ts
│       └── helpers.ts           # Shared test utilities
├── scripts/
│   └── export-psyduck-png.html  # Dev tool for sprite export
└── .github/workflows/
    ├── ci.yml                   # CI: lint, typecheck, test, build
    └── cd.yml                   # CD: deploy to GitHub Pages
```

## Architecture Notes

### Game Component (`PsyduckGame.astro`)
- Self-contained: canvas rendering, UI overlays, event handlers, game loop
- Exposes `window.__gameState` for E2E test assertions
- Uses `requestAnimationFrame` loop for rendering

### Script Modules
- **game.ts**: Pure game logic, no DOM dependencies (testable)
- **animations.ts**: Wraps anime.js for consistent animation patterns
- **audio.ts**: Lazy-initializes Tone.js on first user interaction
- **wobble.ts**: Physics simulation independent of rendering
- **seededRandom.ts**: Wraps seedrandom for reproducible randomness
- **device.ts**: Platform detection, Capacitor integration

### Path Aliases
Use `@/` prefix for imports from `src/`:
```typescript
import { CONFIG, Duck } from "@/scripts/game";
import { fadeIn } from "@/scripts/animations";
```

### State Management
- Game state is a single `GameState` object in component scope
- No external state library - direct mutation with render loop
- High score persisted to `localStorage` key: `psyduck_infinite_headache_highscore`
