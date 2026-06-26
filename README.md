# Spartan CLI — Native Wrapper

## What It Is
A Capacitor-based native wrapper for the Spartan CLI web terminal. Wraps the existing `spartan-cli` web app (at `../spartan-cli`) in native Android and iOS WebView containers.

## Architecture
- Source web build: `~/Documents/spartan-cli/dist/`
- Capacitor web dir: `public/`
- Native platforms: `android/`, `ios/`
- Config: `capacitor.config.json`
- WebSocket: `ws://<server>/terminal?session=native&profile=<profile>&token=...`

## How to Build

### Android
```bash
npx cap sync android
# Then open android/ in Android Studio, build APK
```
**Note**: Requires Java 21. Fedora currently has Java 25/26. Install Java 21 with sudo.

### iOS
```bash
npx cap sync ios
# Then open ios/App/App.xcodeproj in Xcode, build/archive
```
**Note**: Requires macOS. Consider GitHub Actions CI as alternative.

### Development
```bash
# Preview web UI
cd public && python3 -m http.server 9000

# Sync web to native platforms
npx cap sync
```

## Current Status
**Work in progress.** Frontend has known bugs:
- `styles.css` is incomplete (missing input/settings/toast styles)
- `app.js` references `#profile-select` not in HTML (null reference error)
- See `CURRENT_STATE.md` for exact status
- See `HANDOFF.md` for next steps

## Important Notes
- Spartan CLI source (`../spartan-cli/`) is read-only — never modify it
- Token stored in `/home/roy/.config/spartan-cli/env`
- Git repo is the durable truth surface
- See `HANDOFF.md` for current blockers and next steps
