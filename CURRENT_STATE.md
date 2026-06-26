# Spartan CLI — Native Wrapper

## Current State (2026-06-26)

### Completed
- Project initialized in `~/Documents/spartan-native`
- Git repo created
- Capacitor project scaffolded (android + ios platforms)
- Web build from spartan-cli/dist/ copied to public/
- Capacitor sync verified
- UI redesign complete: Discord-inspired dark theme with navy/gold palette
- Custom frontend with command input bar, header, settings panel, WebSocket auto-reconnect
- Settings persisted in LocalStorage (server address, auth token, font size)
- README.md, CURRENT_STATE.md, PROJECT_LOG.md created

### What Works
- `npx cap sync` copies web build to native platforms
- Both android and ios project folders generated
- Basic Capacitor configuration is in place

### What Needs Doing
- First build test (Android: `./gradlew assembleDebug`; iOS: Xcode archive)
- Icon and splash screen customization (using the existing `icon.png` from spartan-cli)
- Testing on a real device (Android emulator or connected phone)
- APK/IPA generation and sideloading test
- Optional: add `@capacitor/network` to detect Tailscale connectivity

### Dependencies
- Node.js (Capacitor CLI v8.x)
- Android SDK (for Android builds)
- Xcode (for iOS builds, macOS only)
