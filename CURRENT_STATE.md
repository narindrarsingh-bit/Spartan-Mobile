# Spartan Native — Current State (2026-06-26)

## Head
Pending commit: full frontend redesign (HTML/CSS/JS rewrite + doc updates)

## What Works
- Capacitor scaffold: `android/` and `ios/` platform folders generated
- `capacitor.config.json`: Properly configured for Capacitor v7
- `public/icon.png`: 37KB app icon present
- **Frontend fully redesigned** (not yet committed):
  - `public/index.html`: Discord-like mobile layout with profile tabs, viewport-fit=cover, enterkeyhint="send"
  - `public/styles.css`: Discord dark theme, 100dvh for iOS keyboard, message-style output, mobile-friendly input bar, settings panel, toasts
  - `public/app.js`: Full rewrite — smart server detection, DEFAULT_TOKEN, wss:// for Tailscale, ANSI stripping (CSI+OSC), queued writes, localStorage persistence, settings panel
- Desktop browser test: **PASSED**
  - WebSocket connects to 127.0.0.1:8797
  - Commands send and output returns
  - Profile switching works (shell/qwen/hermes)
  - ANSI codes stripped cleanly
  - Settings panel works
  - Zero JS errors
- Backend WebSocket: works on localhost (verified with curl — 101 Switching Protocols)
- HTTPS proxy: works (verified with curl over Tailscale IP — 101 Switching Protocols)
- Backend /api/health: returns session data, auth enabled
- `spartan-cli/public/` synced with `spartan-native/public/`

## What Does Not Work / Is Unverified
- **New frontend NOT tested on iPhone** — HTML/CSS/JS rewritten but not yet synced to spartan-cli/public/ or tested over Tailscale
- **Mobile viewport behavior unverified** — keyboard input, scroll-to-bottom, 100dvh not tested on device
- **Android build**: Blocked by Java version mismatch (Fedora has Java 25/26, Gradle needs 17 or 21)
- **iOS build**: Impossible without macOS

## Services Running
- `spartan-cli.service` → backend on `127.0.0.1:8797`
- `spartan-cli-https.service` → HTTPS proxy on `100.78.120.128:8797`
- Python HTTP server → `0.0.0.0:9002` (serves spartan-native/public/)

## Known Risks
- `spartan-cli/` is NOT versioned — changes to backend/server files are not tracked in git
- `spartan-cli/public/` is a copy — any future changes must be synced manually
- Java 21 install requires `sudo`
- Self-signed TLS cert may need manual trust on iPhone
- Token embedded in app.js DEFAULT_TOKEN constant (acceptable for private/internal use)
