# Tech Stack

## Framework & Build
- **Astro 5** - Static site generator with component islands
- **TypeScript** - Strict mode enabled
- **Vite** - Bundler (via Astro)
- **pnpm 10.2+** - Package manager (required)
- **Node.js 22+** - Runtime (required)

## Core Libraries
- **anime.js 4.x** - UI animations (score updates, transitions, particles)
- **Tone.js 15.x** - Web Audio synthesis for sound effects
- **seedrandom** - Deterministic RNG for reproducible gameplay
- **@vite-pwa/astro** - PWA manifest and service worker generation

## Native/Mobile
- **Capacitor 8** - iOS/Android wrapper
- **@capacitor/haptics** - Native haptic feedback
- **@capacitor/motion** - Gyroscope/accelerometer access

## Code Quality
- **Biome 2.3** - Linting and formatting (replaces ESLint/Prettier)
- **astro check** - Astro component validation

## Testing
- **Vitest** - Unit tests (`tests/unit/`)
- **Playwright** - E2E tests (`tests/e2e/`)
- **jsdom** - DOM environment for unit tests

## Common Commands

```bash
# Development
pnpm dev              # Start dev server (localhost:4321)
pnpm build            # Production build to dist/
pnpm preview          # Preview production build

# Code Quality
pnpm check            # Run astro check + biome check
pnpm format           # Auto-format with Biome
pnpm lint             # Lint with Biome

# Testing
pnpm test             # Run all tests (unit + e2e)
pnpm test:unit        # Vitest unit tests only
pnpm test:e2e         # Playwright E2E tests only
pnpm test:e2e:ui      # Playwright with interactive UI

# Mobile
pnpm cap:sync         # Sync Capacitor native projects
pnpm cap:add:ios      # Add iOS platform
pnpm cap:add:android  # Add Android platform
```

## Configuration Files
- `astro.config.mjs` - Astro + PWA config, base path `/psyducks-infinite-headache/`
- `biome.json` - Linting rules, 2-space indent, double quotes, semicolons
- `tsconfig.json` - Path aliases: `@/*` → `./src/*`
- `vitest.config.ts` - jsdom environment, path aliases
- `playwright.config.ts` - Multi-browser, mobile viewports, CI settings
