# Spartan Native — Handoff

## Current Goal
Desktop web test PASSED with full Discord-like frontend redesign. Next: mobile/iPhone viewport test over Tailscale.

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
- Discord-like mobile layout with profile tabs (shell/qwen/hermes)
- viewport-fit=cover for notch device safe areas
- enterkeyhint="send" for mobile keyboards
- Settings panel overlay with server address + token inputs
- Status dot (connected/disconnected)

### public/styles.css
- Discord dark theme palette (#313338 / #2b2d31 / #5865f2)
- 100dvh height for iOS keyboard behavior (no viewport collapse)
- Profile tabs as horizontal channel-like buttons
- Message-style output area with scroll
- Bottom-fixed input bar with send button
- Floating settings button (FAB-style)
- Settings panel slide-in overlay
- Toast notifications

### public/app.js
- IIFE with strict mode, no global leaks
- `getDefaultServer()` — smart default: localhost → 127.0.0.1:8797, everything else → Tailscale IP
- `DEFAULT_TOKEN` fallback so users don't need to manually enter auth
- WebSocket protocol: wss:// for Tailscale IPs, ws:// for localhost
- ANSI escape stripping: CSI sequences + OSC sequences (BEL/ST terminators)
- Profile tab switching with reconnect
- Queued writes on disconnect (replay on reconnect)
- localStorage persistence for server/token/profile
- Settings panel with connect/reconnect button
- 3-second reconnect backoff

## Backend Changes (Previous Sessions, Already Committed)
- `spartan-cli/server/index.mjs`: `sameOriginUpgrade` patched to allow:
  - Local socket connections (127.0.0.1 / ::1)
  - HTTPS proxy forwarded connections (checks `x-forwarded-proto: https`)
- `spartan-cli/server/index.mjs`: `authorizedUpgrade` skips auth for local requests, validates token from URL param for remote requests

## What Works (Verified)
1. **Desktop browser test** — http://127.0.0.1:9002
   - WebSocket connects to 127.0.0.1:8797 via ws://
   - Commands send and output returns (tested: echo hello from spartan)
   - ANSI codes stripped cleanly (Spartan logo renders)
   - Profile switching works (shell → qwen → hermes)
   - Settings panel opens/closes
   - localStorage persists server/token/profile
   - Zero JS errors in console
2. **Backend health** — curl to /api/health returns sessions, auth enabled
3. **iPhone Tailscale test** — PASSED (2026-06-26, previous session)
   - WebSocket connects over wss://100.78.120.128:8797
   - Code 1006 resolved by DEFAULT_TOKEN + wss:// fixes

## What Is NOT Yet Verified
1. **Mobile viewport behavior** — keyboard input, scroll-to-bottom, 100dvh on actual iPhone Safari (new CSS/HTML not yet tested on device)
2. **New frontend on Tailscale** — the redesigned HTML/CSS/JS has not been synced to spartan-cli/public/ or tested on iPhone yet
3. **Android build** — still blocked by Java version

## Blockers
1. **Android build**: Java 25/26 on Fedora, Gradle needs Java 17 or 21. Requires `sudo dnf install java-21-openjdk`
2. **iOS native build**: No macOS available. Options: GitHub Actions CI or physical Mac.

## Ordered Next Steps
### Step 1: Test new frontend on iPhone over Tailscale
1. Sync: `rsync -av public/ ../spartan-cli/public/`
2. Navigate iPhone Safari to `http://100.78.120.128:9002`
3. Verify layout renders correctly (Discord-like dark theme, profile tabs)
4. Verify typing works (input bar, keyboard, send)
5. Verify profile switching works
6. Verify scroll behavior with keyboard open

### Step 2: If mobile test passes — commit + proceed to iOS build
- Install Java 21 for Android (optional)
- Set up GitHub Actions workflow for iOS builds
- Or find macOS build target
