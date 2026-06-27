# Spartan Native — Handoff

## Current Goal
Discord-style sidebar redesign complete. Desktop tested. **iPhone Safari test is the current blocker.**

## Architecture
```
Desktop (browser) → http://127.0.0.1:9002  (Python HTTP server, static files from spartan-native/public/)
                  → ws://127.0.0.1:8797     (direct backend, no proxy needed on localhost)
                  ↘
            http://127.0.0.1:8797  (spartan-cli backend, Node.js + ws library)

iPhone (Safari)  → http://100.78.120.128:9002  (Python HTTP server on Tailscale)
                  → wss://100.78.120.128:8797    (HTTPS proxy via spartan-cli-https.service)
                                  ↘
                        http://127.0.0.1:8797  (spartan-cli backend)
```

- **Frontend source**: `spartan-native/public/` (canonical, versioned in git)
- **Mirror**: `spartan-cli/public/` (copied from spartan-native, NOT versioned)
- **Backend**: `spartan-cli/server/index.mjs` — Express + WebSocket via `ws` library
- **HTTPS Proxy**: `spartan-cli/server/https-proxy.mjs` — TLS termination, raw TCP relay for WS upgrades
- **Dev server**: Python HTTP server on port 9002 serving `spartan-native/public/`
- **Token**: `/home/roy/.config/spartan-cli/env` → `SPARTAN_TOKEN=90883f825783b67a9adf94d22547603f876f4b28469fd803`
- **WebSocket endpoint**: `/terminal?session=native&profile=<profile>&token=<token>`

## Services
| Service | Bind | Status |
|---------|------|--------|
| `spartan-cli.service` | `127.0.0.1:8797` | active |
| `spartan-cli-https.service` | `100.78.120.128:8797` | active |
| Python dev server | `0.0.0.0:9002` | active (serves spartan-native/public/) |

## Frontend Files (public/)

### public/index.html
- Discord-style sidebar layout: left agent rail + main content area
- Sidebar: 72px fixed rail with circular SVG agent avatars (H, C, Cl, O)
- Main area: topbar (agent name), output area, input bar
- Settings modal overlay with server address + token inputs
- Mobile responsive: ≤600px sidebar overlays main content

### public/styles.css
- Discord dark theme palette (#313338 / #2b2d31 / #5865f2)
- 100dvh height for iOS keyboard behavior (no viewport collapse)
- Sidebar: 72px fixed rail, circular SVG avatars with initials, active pill indicator
- Main area: flex layout, topbar with status dot, scrollable output, fixed input bar
- Output: monospace font, message bubbles, proper scrolling
- Input bar: bottom-fixed with send button
- Modal: centered overlay with form fields
- Mobile: ≤600px sidebar overlay with hamburger toggle
- Toast notifications
- env(safe-area-inset-*) for notch devices

### public/app.js
- IIFE with strict mode, no global leaks
- Agent definitions: hermes, codex, claude-code, opencode (colors + initials)
- `getDefaultServer()` — smart default: localhost → 127.0.0.1:8797, everything else → Tailscale IP
- `DEFAULT_TOKEN` fallback so users don't need to manually enter auth
- WebSocket protocol: wss:// for Tailscale IPs, ws:// for localhost
- ANSI escape stripping: CSI (incl. xterm > variants, space params), OSC, single-char escapes (scroll up, etc.), carriage returns, control chars
- Sidebar render: creates circular SVG avatars with initials
- Agent switching: updates sidebar highlight, topbar, reconnects WebSocket
- Queued writes on disconnect (replay on reconnect)
- localStorage persistence for server/token/profile
- Settings modal with connect/reconnect button
- Mobile hamburger toggle for sidebar
- 3-second reconnect backoff

## Backend Changes (Previous Sessions, Already Committed)
- `spartan-cli/server/index.mjs`: `sameOriginUpgrade` patched to allow:
  - Local socket connections (127.0.0.1 / ::1)
  - HTTPS proxy forwarded connections (checks `x-forwarded-proto: https`)
- `spartan-cli/server/index.mjs`: `authorizedUpgrade` skips auth for local requests, validates token from URL param for remote requests

## What Works (Verified)
1. **Desktop browser test** — http://127.0.0.1:9002
   - Discord sidebar layout renders correctly
   - WebSocket connects to 127.0.0.1:8797 via ws://
   - Commands send and output returns
   - Agent switching works (Hermes → Codex → Claude → OpenCode)
   - ANSI codes stripped cleanly (Hermes output clean, Codex has minor live-status overlap)
   - Settings modal opens/closes
   - localStorage persists server/token/profile
   - Zero JS errors in console
2. **Backend health** — curl to /api/health returns sessions, auth enabled
3. **iPhone Tailscale test** — PASSED (2026-06-26, previous session, old frontend)
   - WebSocket connects over wss://100.78.120.128:8797
   - Code 1006 resolved by DEFAULT_TOKEN + wss:// fixes
4. **Files synced** — spartan-cli/public/ matches spartan-native/public/

## What Is NOT Yet Verified
1. **New sidebar frontend on iPhone** — PENDING (current blocker)
2. **Mobile viewport behavior** — keyboard input, scroll-to-bottom, 100dvh on actual iPhone Safari
3. **Sidebar overlay on ≤600px** — hamburger toggle, overlay dismiss
4. **Android build** — still blocked by Java version

## Blockers
1. **iPhone test needed** — cannot verify mobile behavior without device access
2. **Android build**: Java 25/26 on Fedora, Gradle needs Java 17 or 21. Requires `sudo dnf install java-21-openjdk`
3. **iOS native build**: No macOS available. Options: GitHub Actions CI or physical Mac.

## Ordered Next Steps
### Step 1: Test new sidebar frontend on iPhone over Tailscale
1. iPhone Safari → `http://100.78.120.128:9002`
2. Verify sidebar renders (circular agent icons, active pill)
3. Verify typing works (input bar, keyboard, send)
4. Verify agent switching (tap each icon, confirm topbar changes)
5. Verify scroll behavior with keyboard open
6. Verify safe areas/notch handling
7. If WebSocket fails, check exact error from console + backend logs

### Step 2: If mobile test passes — commit + proceed
- Commit with clear message
- Proceed to iOS/Android build
