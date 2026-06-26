# Spartan CLI — Native Wrapper

## What It Is
A Capacitor-based native wrapper for the Spartan CLI web terminal. Wraps the existing `spartan-cli` web app (at `../spartan-cli`) in native Android and iOS WebView containers.

## Architecture
- Source web build: `~/Documents/spartan-cli/dist/`
- Capacitor web dir: `public/` (copied from spartan-cli/dist)
- Native platforms: `android/`, `ios/`
- Config: `capacitor.config.json`

## How to Build

### Android
```bash
npm run build-android   # copies web build, syncs to android/, ready for Android Studio
```
Then open Android Studio, load `android/`, and build an APK/AAB.

### iOS
```bash
npm run build-ios       # copies web build, syncs to ios/, ready for Xcode
```
Then open Xcode, load `ios/App/App.xcodeproj`, and build. For sideloading: archive and distribute via Xcode or Sideloadly.

### Development
```bash
npx cap run android     # live-reload to connected Android device
npx cap run ios         # live-reload to connected iOS device
```

## Important Notes
- The WebView loads the web build from the local `public/` directory.
- The Spartan CLI app communicates with the backend over WebSocket to a Tailscale IP.
- The `public/` directory must be kept in sync with `spartan-cli/dist/`.
- No code changes needed in the web app — this is a pure native shell wrapper.

## Handoff
- Git repo is the durable truth surface.
- CURRENT_STATE.md tracks live state.
- PROJECT_LOG.md tracks dated work.
- See `../spartan-cli/README.md` for the web app documentation.
