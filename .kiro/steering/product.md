# Product Overview

Psyduck's Infinite Headache is a browser-based stacking game PWA where players stack Psyduck characters as high as possible.

## Core Gameplay
- Drag falling ducks left/right to position, then tap/click to drop
- Stack 5 ducks to merge into a larger base duck
- Grow the base duck to fill 80% of screen width to level up
- Tower wobbles based on stack balance - keep it stable or game over
- Seeded randomness allows reproducible gameplay via shareable seeds

## Key Features
- Progressive difficulty: spawn intervals decrease, wobble increases per level
- Perfect landing bonus for precise stacking
- Auto-drop timer adds time pressure
- High score persistence via localStorage
- Offline-capable PWA with service worker caching
- Responsive design: 412px-800px design width scales to viewport
- Haptic feedback on native (Capacitor)
- Gyroscope tilt controls on mobile devices

## Target Platforms
- Web browsers (desktop and mobile)
- iOS/Android via Capacitor wrapper
- Deployed to GitHub Pages at `/psyducks-infinite-headache/`
