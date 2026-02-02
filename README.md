# Psyduck's Infinite Headache

🦆 **Psyduck's Infinite Headache** - A progressive web app stacking game built with Astro.

## Overview

Stack Psyducks as high as you can! Land perfectly for bonus stability. The headache grows with the tower as your score increases, making the game progressively more challenging.

## Features

- 🎮 **Addictive Gameplay**: Simple tap/click controls with increasing difficulty
- 📱 **PWA Support**: Install on your device and play offline
- 🎨 **Animated Graphics**: Canvas-based rendering with anime.js-powered smooth animations
- 🔊 **Enhanced Audio**: Rich sound effects using Tone.js Web Audio framework
- 💾 **High Score Tracking**: Local storage persistence
- 🌈 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast Performance**: Built with Astro for optimal loading
- 📦 **No CDN Dependencies**: All assets bundled locally

## Development

### Prerequisites

- Node.js 22.x or higher
- pnpm 10.2.0

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Available Scripts

- `pnpm dev` - Start Astro development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Run Astro check and Biome linting
- `pnpm format` - Format code with Biome
- `pnpm lint` - Lint code with Biome
- `pnpm test` - Run all tests (unit + E2E)
- `pnpm test:unit` - Run Vitest unit tests
- `pnpm test:unit:watch` - Run unit tests in watch mode
- `pnpm test:e2e` - Run Playwright E2E tests
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI
- `pnpm export:psyduck` - Open PNG exporter tool (dev utility)

### PNG Exporter Tool

The project includes a dev utility for exporting high-quality Psyduck sprites as PNG files with transparent backgrounds:

```bash
pnpm export:psyduck
```

This opens an interactive HTML tool where you can:
- Adjust duck size, colors, and pose
- Set merge level (adds ★ indicators)
- Export as:
  - **App Icon** (512x512) - For PWA icons and favicons
  - **Masthead/Logo** (800x400) - For main menu header
  - **Sprite** (400x400) - For static UI elements

All exports have transparent backgrounds and can be customized to match level themes.

### Testing

The project includes comprehensive testing:

#### Unit Tests (Vitest)

Tests for game logic, duck physics, particle system, and collision detection.

```bash
pnpm test:unit
```

#### E2E Tests (Playwright)

End-to-end tests covering:
- Game initialization
- User interactions (tap/click/keyboard)
- Score tracking
- Game over scenarios
- PWA features

```bash
pnpm test:e2e
```

### Code Quality

The project uses:
- **Biome 2.3** for formatting and linting
- **TypeScript** for type safety
- **Astro check** for component validation

```bash
pnpm check
```

## Project Structure

```text
├── .github/
│   └── workflows/          # CI/CD pipelines
│       ├── ci.yml         # Continuous Integration
│       └── cd.yml         # Deployment to GitHub Pages
├── src/
│   ├── layouts/
│   │   └── Layout.astro   # Main layout with PWA meta tags
│   ├── pages/
│   │   └── index.astro    # Game page
│   ├── components/
│   │   └── PsyduckGame.astro  # Game component
│   ├── scripts/
│   │   └── game.ts        # Game logic (TypeScript)
│   └── styles/
│       └── global.css     # Global styles
├── public/
│   ├── icons/             # PWA icons
│   └── favicon.svg        # Favicon
├── tests/
│   ├── unit/              # Vitest unit tests
│   └── e2e/               # Playwright E2E tests
├── astro.config.mjs       # Astro configuration
├── biome.json            # Biome configuration
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Vitest configuration
└── playwright.config.ts  # Playwright configuration
```

## Deployment

The project automatically deploys to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch.

### CI Pipeline
- Runs Biome checks
- Validates TypeScript
- Executes unit tests
- Builds the project
- Runs E2E tests

### CD Pipeline
- Builds production bundle
- Deploys to GitHub Pages
- Available at: [https://arcade-cabinet.github.io/psyducks-infinite-headache/](https://arcade-cabinet.github.io/psyducks-infinite-headache/)

## PWA Features

- **Offline Support**: Service worker caches assets for offline play
- **Installable**: Add to home screen on mobile devices
- **App-like Experience**: Runs in standalone mode
- **Theme Customization**: Purple theme matching the game aesthetic

## Technology Stack

- **Framework**: Astro 5
- **Language**: TypeScript
- **Styling**: CSS with custom properties
- **Animation**: anime.js 4.x for UI animations
- **Audio**: Tone.js 15.x for enhanced sound system
- **Fonts**: @fontsource (local, no CDN)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Code Quality**: Biome 2.3
- **PWA**: @vite-pwa/astro
- **CI/CD**: GitHub Actions

## License

See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please ensure:
- Code passes all tests (`pnpm test`)
- Code is formatted (`pnpm format`)
- TypeScript compiles without errors (`pnpm check`)

---

Built with 💜 by the arcade-cabinet team
