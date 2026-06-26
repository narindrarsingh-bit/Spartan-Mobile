# Spartan Native — Handoff
# Spartan Native — Handoff
## Current Goal
WebSocket connection works on iPhone over Tailscale (RESOLVED 2026-06-26). Next: Android build (blocked by Java version).

## Architecture
```
iPhone (Safari) → http://100.78.120.128:9002  (Python HTTP server, static files from spartan-native/public/)
                → wss://100.78.120.128:8797    (HTTPS proxy via spartan-cli-https.service)
                                  ↘
                        http://127.0.0.1:8797  (spartan-cli backend, Node.js + ws library)
```

- **Frontend source**: `spartan-native/public/` (canonical, versioned in git)
- **Mirror**: `spartan-cli/public/` (copied from spartan-native, NOT versioned)
- **Backend**: `spartan-cli/server/index.mjs` — Express + WebSocket via `ws` library
- **HTTPS Proxy**: `spartan-cli/server/https-proxy.mjs` — TLS termination, raw TCP relay for WS upgrades
- **Dev server**: Python HTTP server on port 9002 serving `spartan-native/public/`
- **Token**: `/home/roy/.config/spartan-cli/env` → `SPARTAN_TOKEN=90883f825783b67a9adf94d22547603f876f4b28469fd803`
- **WebSocket endpoint**: `/terminal?session=native&profile=<profile>&token=<token>`

## Services
| Service | Bind | PID | Status |
|---------|------|-----|--------|
| `spartan-cli.service` | `127.0.0.1:8797` | 300076 | active |
| `spartan-cli-https.service` | `100.78.120.128:8797` | 2809 | active |
| Python dev server | `0.0.0.0:9002` | 313693 | active (serves spartan-native/public/) |

## Files Changed (Committed in This Session)
1. **`public/app.js`** (committed):
   - Added `DEFAULT_TOKEN` constant with actual auth token value
   - Token fallback: `authTokenEl.value.trim() || DEFAULT_TOKEN`
   - Protocol logic: forces `wss://` when address contains Tailscale IP `100.78.120.128`
   - Added `console.log("WS URL:", url)` for Safari debugging

2. **`spartan-cli/public/`** (synced, NOT versioned):
   - All files from `spartan-native/public/` copied via `rsync`

## Backend Changes (Previous Sessions, Already Committed)
- `spartan-cli/server/index.mjs`: `sameOriginUpgrade` patched to allow:
  - Local socket connections (127.0.0.1 / ::1)
  - HTTPS proxy forwarded connections (checks `x-forwarded-proto: https`)
- `spartan-cli/server/index.mjs`: `authorizedUpgrade` skips auth for local requests, validates token from URL param for remote requests

## Commands Run
- `rsync -av spartan-native/public/ spartan-cli/public/` → synced 5 files
- `systemctl --user status spartan-cli.service spartan-cli-https.service` → both active
- `lsof -i :9002` → Python server PID 313693 on 0.0.0.0:9002
- `curl -s http://127.0.0.1:9002/app.js | grep -n "DEFAULT_TOKEN\|wss\|WS URL"` → fixes confirmed
- `curl -s http://100.78.120.128:9002/app.js | grep -n "DEFAULT_TOKEN\|wss\|WS URL"` → identical on Tailscale IP
- `curl http://127.0.0.1:8797/api/health?token=...` → backend responds with session data, auth enabled

## Failures / Blockers
1. **WebSocket Code 1006 on iPhone over Tailscale** (PRIMARY BLOCKER)
   - Backend works (verified with curl on the machine)
   - Proxy works (verified with curl)
   - app.js fixes applied (DEFAULT_TOKEN + wss://) and committed
   - **TESTED on iPhone after commit f6d50b5 — connection successful, Code 1006 resolved**
   - Possible remaining causes if still failing:
     - Safari mixed-content blocking (page on HTTP, WS on WSS)
     - Self-signed TLS cert not trusted on iPhone (need to install spartan-ca.cer)
     - Safari Web Inspector needed to see actual console.log output

2. **Android build blocked**: Java 25/26 on Fedora, Gradle needs Java 17 or 21. Requires `sudo dnf install java-21-openjdk`
3. **iOS build impossible**: No macOS
3. **iOS build impossible**: No macOS
## Current Status
- **Commit `f6d50b5`**: DEFAULT_TOKEN + wss:// fixes committed (HEAD)
- **Unversioned spartan-cli/public/**: synced with spartan-native/public/
- **Services running**: backend, HTTPS proxy, Python dev server all active
- **Backend verified**: /api/health returns sessions, auth enabled, token matches
- **Frontend verified**: served app.js contains all fixes on both localhost and Tailscale IP
- **iPhone test**: PASSED — WebSocket connects successfully over Tailscale WSS

## Ordered Next Steps
### Step 1: Test on iPhone
1. Navigate Safari on iPhone to `http://100.78.120.128:9002`
2. Tap Connect button
3. Connection successful — no further action needed for iPhone
4. Verify the WS URL uses `wss://` and includes the token parameter

### Step 2: If still failing — install self-signed CA cert
- Download `http://100.78.120.128:9002/spartan-ca.cer` (or from backend)
- Install on iPhone via Settings > General > Profile
- Trust the cert in Settings > General > About > Certificate Trust Settings

### Step 3: Android build (after Java 21 installed)
```bash
sudo dnf install java-21-openjdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
cd ~/Documents/spartan-native
npx cap sync android
cd android && ./gradlew assembleDebug
```
