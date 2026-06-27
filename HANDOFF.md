# Spartan Native — Handoff

## Current Goal
Thread panel + multi-session support implemented. Agent communication fixed. **iPhone Safari test is the current blocker.**

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
- **Token**: `/home/roy/.config/spartan-cli/env` → `SPARTAN_TOKEN`
- **WebSocket endpoint**: `/terminal?session=<id>&profile=<profile>&token=<token>`

## Services
| Service | Bind | Status |
|---------|------|--------|
| `spartan-cli.service` | `127.0.0.1:8797` | active |
| `spartan-cli-https.service` | `100.78.120.128:8797` | active |
| Python dev server | `0.0.0.0:9002` | active (serves spartan-native/public/) |

## Frontend Files (public/)

### public/index.html
- Sidebar (72px): agent circles (Hermes/Codex/Claude/OpenCode) + logo + settings gear
- Thread panel (64px): slides out when agent tapped
  - Header: agent initial
  - + button: green circle, creates new concurrent agent instance
  - Thread circles: numbered (1, 2, 3...), tap to switch, long-press to wiggle/close
- Main area: topbar, output, input bar
- Settings modal

### public/styles.css
- Discord dark theme palette (#313338 / #2b2d31 / #1e1f22)
- Thread panel: 0→64px width transition, dark bg, header, scrollable list
- Thread circles: 40px, agent color, active pill indicator
- + button: 40px green (#23a559) circle
- Wiggle: `@keyframes wiggle` rotation animation
- X button: 16px red circle, hidden until `.wiggling` class active
- Mobile: compact sizing (52px panel, 36px circles)
- env(safe-area-inset-*) for notch devices

### public/app.js
- IIFE with strict mode, no global leaks
- Multi-session architecture: `threads[agentId] = [{id, ws, lines, status, ...}]`
- Thread lifecycle: create (new WS with unique session ID), switch (restore buffer), close (kill WS)
- Long press detection: `pointerdown` + 500ms timer → wiggle mode
- Wiggle mode: `.wiggling` class, X buttons visible, click anywhere to exit
- Thread panel toggle: tap agent → open/close/switch
- Per-thread WebSocket with reconnect backoff
- `sendInput` appends `\r` for PTY execution
- Smart server detection: localhost → ws://, Tailscale → wss://
- Settings modal with reconnect
- Queued writes per thread

## Backend Changes
- `spartan-cli/server/index.mjs`: `sameOriginUpgrade` patched to allow:
  - Local socket connections (127.0.0.1 / ::1)
  - HTTPS proxy forwarded connections (checks `x-forwarded-proto: https`)
- `spartan-cli/server/index.mjs`: `authorizedUpgrade` skips auth for local requests, validates token from URL param for remote requests
- `spartan-cli/server/index.mjs` (2026-06-27): `normalizeProfile` includes `claude-code`

## What Works (Verified)
1. **Desktop browser test (sidebar + input fix)** — previous session
2. **Multi-session WebSocket** — 2 concurrent Codex threads work independently
3. **Backend health** — curl to /api/health returns sessions, auth enabled
4. **Files synced** — spartan-cli/public/ matches spartan-native/public/

## What Is NOT Yet Verified
1. **Thread panel on desktop browser** — visual test pending
2. **Thread panel on iPhone over Tailscale** — PENDING (current blocker)
3. **Long press wiggle UX on mobile** — touch behavior, X tap accuracy
4. **Android build** — still blocked by Java version

## Blockers
1. **Desktop + iPhone test needed** — verify thread panel renders, slide animation, + button, wiggle, close
2. **Android build**: Java 25/26 on Fedora, Gradle needs Java 17 or 21
3. **iOS native build**: No macOS available

## Ordered Next Steps
### Step 1: Desktop browser test
1. Browser → `http://127.0.0.1:9002`
2. Tap Hermes circle → thread panel slides out
3. Tap + button → thread created, main area shows output
4. Type command → verify echo
5. Tap + again → second thread, both alive
6. Switch between threads → verify independent output
7. Long press thread circle → wiggle + X appears
8. Close thread → verify cleanup

### Step 2: iPhone Safari test
1. iPhone Safari → `http://100.78.120.128:9002`
2. Verify panel slide, thread creation, wiggle UX on device
