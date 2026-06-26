# Spartan Native — Current State (2026-06-26)

## What Works
- Capacitor scaffold: `android/` and `ios/` platform folders generated
- Git repo: HEAD at `b53dbef`
- `public/index.html`: App shell with header, output, input, settings panel, profile-select dropdown
- `public/styles.css`: Complete — 398 lines, all UI sections styled
- `public/app.js`: 221 lines, WebSocket logic with DEFAULT_TOKEN + wss:// fixes (committed)
- `public/icon.png`: 37KB app icon present
- `capacitor.config.json`: Properly configured for Capacitor v7
- Web UI: loads in browser with zero JS errors, settings opens/closes, profile-select works, toast works
- Backend WebSocket: works on localhost (verified with curl — 101 Switching Protocols)
- HTTPS proxy: works (verified with curl over Tailscale IP — 101 Switching Protocols)
- Backend /api/health: returns session data, auth enabled, token matches
- Frontend served on port 9002: contains all fixes, accessible on both localhost and Tailscale IP
- `spartan-cli/public/` synced with `spartan-native/public/`

## What Does Not Work
- **WebSocket on iPhone over Tailscale** — RESOLVED, tested and confirmed working (2026-06-26)
- **Android build**: Blocked by Java version mismatch (Fedora has Java 25/26, Gradle needs 17 or 21)
- **iOS build**: Impossible without macOS

## Exact Run/Build Status
```
$ cd ~/Documents/spartan-native
$ git status → clean working tree
$ git log --oneline -1 → b53dbef Update docs: iPhone test passed, WebSocket Code 1006 resolved
$ curl -s http://127.0.0.1:9002/app.js | grep -c "DEFAULT_TOKEN" → 2
$ curl -s http://127.0.0.1:9002/app.js | grep -c "wss://" → 1
$ diff spartan-native/public/ spartan-cli/public/ → identical
$ systemctl --user status spartan-cli.service → active (PID 300076)
$ systemctl --user status spartan-cli-https.service → active (PID 2809)
$ lsof -i :9002 → Python HTTP server PID 441648 (restarted 2026-06-26)
$ curl http://100.78.120.128:9002 → iPhone Safari test: WebSocket connects successfully
```

## Services Running
- `spartan-cli.service` → backend on `127.0.0.1:8797`
- `spartan-cli-https.service` → HTTPS proxy on `100.78.120.128:8797`
- Python HTTP server → `0.0.0.0:9002` (serves spartan-native/public/)

## Known Risks
- `spartan-cli/` is NOT versioned — changes to backend/server files are not tracked in git
- `spartan-cli/public/` is a copy — any future changes must be synced manually
- Java 21 install requires `sudo`
- Self-signed TLS cert may need manual trust on iPhone
