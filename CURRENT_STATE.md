# Spartan Native — Current State (2026-06-27)

## Head
Uncommitted: Thread panel + multi-session support, iPhone composer layout experiments, trust-profile links

## Critical Distinction
- **Spartan CLI is separate** and lives in `/home/roy/Documents/spartan-cli`.
- Real CLI URL: `https://100.78.120.128:8797/` on phone/Tailscale, `http://127.0.0.1:8797/` locally.
- Native wrapper preview URL: `http://127.0.0.1:9002/` locally or `http://100.78.120.128:9002/` on phone/Tailscale.
- Do not overwrite/rebuild the real CLI from the native wrapper unless Roy explicitly asks.

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
- iPhone trust material is served from the phone-facing static app:
  - `http://100.78.120.128:9002/spartan-ca.mobileconfig`
  - `http://100.78.120.128:9002/spartan-ca.cer`
  - Settings modal links to both files

## What Does Not Work / Is Unverified
- **iPhone composer placement is PAUSED / unresolved.** The left rail is now correct. The composer is close but not final, and the last CSS nudge loop was not worth continuing without real device/WebView inspection.
- **Composer tap/type needs re-verification.** The current served state uses `.composer-dock { pointer-events: none; }` and `.input-bar { pointer-events: auto; }`; one attempt changing the dock to `pointer-events: auto` plus lowering it to 5px was worse and was reverted.
- **iPhone Safari thread-panel retest — PENDING** after trust-profile static route/link addition
- **Android build**: Blocked by Java version mismatch (Fedora has Java 25/26, Gradle needs 17 or 21)
- **iOS build**: Impossible without macOS

## Services Running
- `spartan-cli.service` → backend on `127.0.0.1:8797`
- `spartan-cli-https.service` → HTTPS proxy on `100.78.120.128:8797`
- Python HTTP server → currently serving native-wrapper preview on `9002`

## Current CLI Entry Point
- Use `https://100.78.120.128:8797/` on phone/Tailscale for the real Spartan CLI
- Use `http://127.0.0.1:8797/` locally for the real Spartan CLI
- Use `9002` only when intentionally previewing the native wrapper.

## iPhone Composer Layout Notes
- Failed loop: tweaking composer bottom padding alone kept recreating or moving the visual "L" problem.
- Accepted direction from Roy: the bottom part of the L does not need to exist; the left strip/rail must extend to the bottom.
- Current better structure: fixed full-screen app, absolute left rail, absolute main area, composer absolutely positioned only over the main column.
- Current state by Roy's report: left bar is right; composer vertical position still needs device-level adjustment.
- Do not continue blind pixel nudges. Next pass should use Android Studio / WebView bounds / device screenshots to inspect viewport, safe-area, and tap target geometry.

## Known Risks
- `spartan-cli/` is NOT versioned — changes to backend/server files are not tracked in git. Critical changes (like this one) are documented here for agent visibility.
- `spartan-cli/public/` is a copy — any future changes must be synced manually

## Backend Changes (unversioned — in spartan-cli)
- **OpenCode profile now uses `-c` flag** (2026-06-29): `args: ['--model', 'deepseek/deepseek-v4-pro', '-c', '--mini']`. This means Spartan-launched OpenCode sessions continue the last active session instead of starting fresh every time. The `-c` flag reads the session DB at `~/.local/share/opencode/opencode.db`. All agents should be aware that Spartan OpenCode sessions now share context across launches.
- Java 21 install requires `sudo`
- Self-signed TLS cert may need manual trust on iPhone
- Token embedded in app.js DEFAULT_TOKEN constant (acceptable for private/internal use)
- Codex output has minor garbling from live status line overwrites
