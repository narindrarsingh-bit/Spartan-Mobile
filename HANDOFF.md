# Spartan Native — Handoff

## Current Goal
Resolve WebSocket Code 1006 failure on mobile device over Tailscale. The frontend loads in Safari on iPhone but cannot establish a WebSocket connection to `100.78.120.128:8797`. The backend (on the same Fedora machine) works perfectly — verified with curl.

## Architecture
```
iPhone (Safari) → https://100.78.120.128:9002  (Python HTTP server, static files from spartan-native/public/)
                → wss://100.78.120.128:8797     (HTTPS proxy via spartan-cli-https.service)
                                  ↘
                        https://100.78.120.128:8797 → 127.0.0.1:8797 (spartan-cli backend)
```

- Web UI: `public/index.html`, `public/app.js`, `public/styles.css` (committed to git)
- Backend WebSocket endpoint: `/terminal?session=native&profile=<profile>&token=<token>`
- Backend served static files from `spartan-cli/public/` (copied from spartan-native/public/)
- HTTPS proxy: `spartan-cli/server/https-proxy.mjs` on `100.78.120.128:8797`, forwards to `127.0.0.1:8797`
- Python dev server: `public/` served on `9001` (for local testing)
- Token stored in `/home/roy/.config/spartan-cli/env` as `SPARTAN_TOKEN=90883f82...d803`

## Files Changed (This Session — Not Yet Committed)
The committed version (HEAD `73664ef`) does NOT include the latest fixes for WebSocket auth.
These were tested live on disk but not committed:

1. **`public/app.js`**: Need to add `DEFAULT_TOKEN` constant and use it as fallback when auth field is empty
2. **`public/app.js`**: Need to use `wss://` when connecting to the Tailscale address (not `ws://` from HTTP page)
3. **`spartan-cli/server/index.mjs`**: `sameOriginUpgrade` patched to allow local and proxied WS upgrades (in spartan-cli repo)
4. **`spartan-cli/public/app.js`**: Updated with same app.js fixes (this is what the backend serves)

## Commands Run
- `curl -sv ... https://100.78.120.128:8797/terminal?session=native&profile=shell&token=...` → **101 Switching Protocols, WebSocket works**
- `curl -sv ... http://127.0.0.1:8797/terminal?...` → **101 Switching Protocols, WebSocket works**
- System services: `spartan-cli.service` (backend), `spartan-cli-https.service` (HTTPS proxy)
- `git log --oneline -5` → HEAD is `73664ef`

## Failures / Blockers
1. **WebSocket Code 1006 on iPhone over Tailscale** (PRIMARY BLOCKER)
   - Backend works (verified with curl on the machine)
   - Proxy works (verified with curl)
   - Root cause suspected: Safari uses `ws://` from HTTP page, needs `wss://` for Tailscale address
   - Also suspected: auth token not sent because localStorage was cleared and no default token
2. **Android build blocked**: Java 25/26 on Fedora, Gradle needs Java 17 or 21. Requires `sudo dnf install java-21-openjdk`
3. **iOS build impossible**: No macOS

## Current Status
- **Committed code (HEAD 73664ef)**: Frontend loads in Safari, no JS errors, but WebSocket fails with Code 1006
- **Uncommitted fixes**: Added DEFAULT_TOKEN fallback and wss:// logic to app.js (on disk, not committed)
- Backend and proxy are running and functional
- Python dev server not currently running

## Ordered Next Steps
### Step 1: Fix WebSocket auth + protocol
The next session should:
1. Apply the DEFAULT_TOKEN fix to `spartan-native/public/app.js` (the canonical source)
2. Apply the wss:// fix for Tailscale addresses
3. Copy updated files to `spartan-cli/public/`
4. Restart the backend service
5. Test from iPhone

### Step 2: Commit the fixes
```bash
cd ~/Documents/spartan-native
git add public/app.js
git commit -m "Fix WebSocket: add default auth token and wss:// for Tailscale"
```

### Step 3: Android build (after Java 21 installed)
```bash
sudo dnf install java-21-openjdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
npx cap sync android
cd android && ./gradlew assembleDebug
```
