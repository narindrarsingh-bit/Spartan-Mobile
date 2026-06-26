# Spartan Native — Current State (2026-06-26)

## What Works
- Capacitor scaffold: `android/` and `ios/` platform folders generated
- Git repo: 6 commits on master
- `public/index.html`: App shell with header, output, input, settings panel, profile-select dropdown
- `public/styles.css`: Complete — 398 lines, all UI sections styled
- `public/app.js`: 219 lines, WebSocket logic, settings, localStorage state — no null refs
- `public/icon.png`: 37KB app icon present
- `capacitor.config.json`: Properly configured for Capacitor v7
- `package.json`: Dependencies and build scripts
- Web UI: loads in browser with zero JS errors, settings opens/closes, profile-select works, toast works
- Backend WebSocket: works on localhost (verified with curl)
- HTTPS proxy: works (verified with curl over Tailscale IP)

## What Does Not Work
- **WebSocket Code 1006 on iPhone over Tailscale** — Frontend loads but connection fails. Uncommitted fixes exist on disk (DEFAULT_TOKEN, wss://) but not committed.
- **Android build**: Blocked by Java version mismatch (Fedora has Java 25/26, Gradle needs 17 or 21)
- **iOS build**: Impossible without macOS

## Exact Run/Build Status
```
$ cd ~/Documents/spartan-native
$ git status → clean working tree
$ git log --oneline -5
  73664ef Update docs: mark frontend blockers resolved, add test results
  3af9aca Complete CSS: input area, settings panel, select, toast styles
  da5bbb8 Add profile-select to settings panel (fixes null ref in app.js)
  f6245de Handoff: fix CSS :root rewrite, update docs, document current blockers
  f93ddb9 Fix WebSocket: use correct /terminal endpoint with session+profile params
$ npx cap sync → works
$ cd public && python3 -m http.server 9001 → UI renders correctly
$ curl → backend and proxy both return 101 Switching Protocols
```

## Services Running
- `spartan-cli.service` → backend on `127.0.0.1:8797`
- `spartan-cli-https.service` → HTTPS proxy on `100.78.120.128:8797`

## Known Risks
- `spartan-cli/public/` is a copy of `spartan-native/public/` — any changes must be synced
- Java 21 install requires `sudo`
- WebSocket fixes on disk are not yet committed
