# Spartan Native — Current State (2026-06-26)

## Head
df33d9e + pending: Discord-style sidebar redesign (complete)

## What Works
- **Discord-style sidebar layout** (not yet committed):
  - `public/index.html`: Left sidebar nav + main content area + settings modal
  - `public/styles.css`: Full Discord dark theme — sidebar rail (72px), circular SVG avatars, main area, topbar, output, input bar, modal, mobile responsive (≤600px overlay sidebar)
  - `public/app.js`: Full rewrite — agent switching (hermes/codex/claude-code/opencode), sidebar render, wss:// for Tailscale, improved ANSI strip (CSI/OSC/single-char/carriage return), queued writes, localStorage persistence, settings modal, mobile hamburger
- Desktop browser test: **PASSED**
  - WebSocket connects to 127.0.0.1:8797
  - Commands send and output returns
  - Agent switching works (Hermes clean, Codex has some live-status overlap — known limitation)
  - ANSI codes stripped cleanly (improved regex catches xterm > variants, spaces, scroll-up escapes)
  - Settings panel works
  - Zero JS errors
- Backend WebSocket: works on localhost (verified with curl — 101 Switching Protocols)
- HTTPS proxy: works (verified with curl over Tailscale IP — 101 Switching Protocols)
- Backend /api/health: returns session data, auth enabled
- `spartan-cli/public/` synced with `spartan-native/public/`

## What Does Not Work / Is Unverified
- **iPhone Safari test — PENDING** (current blocker)
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
- Codex output has minor garbling from live status line overwrites (terminal emulation limitation, not a blocker)
