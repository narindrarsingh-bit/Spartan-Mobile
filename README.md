# Spartan CLI — Native Wrapper

## What It Is
A Capacitor-based native wrapper for the Spartan CLI web terminal. Wraps the existing `spartan-cli` web app (at `../spartan-cli`) in native Android and iOS WebView containers.

## Architecture
- Source web build: `~/Documents/spartan-cli/dist/`
- Capacitor web dir: `public/`
- Native platforms: `android/`, `ios/`
- Config: `capacitor.config.json`
- Backend: `spartan-cli/server/index.mjs` on `127.0.0.1:8797`
- HTTPS proxy: `spartan-cli/server/https-proxy.mjs` on `100.78.120.128:8797`
- WebSocket endpoint: `/terminal?session=native&profile=<profile>&token=<token>`

## How to Build

### Android
```bash
sudo dnf install java-21-openjdk  # Required — Fedora has Java 25/26
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
cd ~/Documents/spartan-native
npx cap sync android
cd android && ./gradlew assembleDebug
```

### iOS
```bash
npx cap sync ios
# Then open ios/App/App.xcodeproj in Xcode, build/archive
```
**Note**: Requires macOS. Consider GitHub Actions CI as alternative.

### Development
```bash
# Preview web UI
cd public && python3 -m http.server 9001

# Sync web to native platforms
npx cap sync

# Backend (serves static files too)
cd ../spartan-cli
systemctl --user restart spartan-cli.service

# HTTPS proxy
systemctl --user restart spartan-cli-https.service
```

## Syncing Changes
After modifying `public/` files, copy to the backend's public directory:
```bash
cp public/* ../spartan-cli/public/
systemctl --user restart spartan-cli.service
```

## Current Status
**Frontend complete.** WebSocket connection works from desktop browser and curl. Mobile over Tailscale may require DEFAULT_TOKEN fix and wss:// protocol adjustment.

- See `CURRENT_STATE.md` for exact status
- See `HANDOFF.md` for blockers and next steps
- See `PROJECT_LOG.md` for session history

## Important Notes
- `spartan-cli/` is read-only source — changes go in `spartan-native/`
- Token stored in `/home/roy/.config/spartan-cli/env`
- Git repo is the durable truth surface
