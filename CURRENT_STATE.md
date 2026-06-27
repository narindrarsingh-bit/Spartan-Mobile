# Spartan Native — Current State (2026-06-27)

## Head
Uncommitted: Thread panel + multi-session support

## What Works
- **Discord-style sidebar layout**:
  - Left agent rail (72px) with circular SVG avatars (H, C, Cl, O)
  - Slide-out thread panel (64px) between sidebar and main area
  - Thread panel shows per-agent thread circles + green "+" button
  - + button creates new concurrent agent instances (independent WebSocket sessions)
  - Long-press thread circle → iOS-style wiggle animation + red X close button
  - Tap thread circle → switches main area to that thread's conversation
  - Multiple threads per agent can run simultaneously (verified: 2 Codex threads work independently)
  - Dark Discord theme (#313338 / #2b2d31 / #1e1f22)
- **Thread lifecycle**: create, switch, close (WebSocket killed on close)
- **Queued writes** per thread (replay on reconnect)
- **sendInput fix**: commands append `\r` so they execute in the PTY
- **claude-code profile fix**: added to `normalizeProfile` in backend
- Smart server detection (localhost → ws://, Tailscale → wss://)
- DEFAULT_TOKEN fallback
- ANSI escape stripping (CSI + OSC + single-char + control chars)
- Settings modal with server/token fields
- localStorage persistence for server/token

## What Does Not Work / Is Unverified
- **iPhone Safari test with thread panel — PENDING** (current blocker)
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
- Codex output has minor garbling from live status line overwrites
