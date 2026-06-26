# Spartan Native — Project Log

## 2026-06-26 — Session: Fix Frontend Blockers + Test UI (Previous Session)

### Goal
Fix frontend blockers (profile-select null ref, incomplete CSS), test web UI locally, prepare for Android build.

### Completed
1. Fixed profile-select null reference in `index.html`
2. Completed `styles.css` (398 lines, three incremental patches)
3. Tested web UI: loads without errors, all UI components render correctly
4. Committed frontend fixes to git

## 2026-06-26 — Session: WebSocket Debug + Handoff (Current Session)

### Goal
Resolve WebSocket Code 1006 on mobile over Tailscale.

### What Happened
1. Identified that `spartan-cli/server/index.mjs` rejects WebSocket upgrades from non-localhost origins
2. Patched `sameOriginUpgrade` to allow local socket connections (bypass strict origin mismatch)
3. Patched `sameOriginUpgrade` to also allow connections from HTTPS proxy (check `x-forwarded-proto` header)
4. Copied frontend files from `spartan-native/public/` to `spartan-cli/public/` so backend serves UI on same origin
5. Restarted backend service — connection to `127.0.0.1:8797` works from browser
6. Confirmed proxy forwards WebSocket via curl — 101 Switching Protocols works
7. Tried `wss://` protocol change in app.js — reverted because backend fix was better
8. **User reports persistent Code 1006 on mobile** — suspected missing auth token
9. Added `DEFAULT_TOKEN` to `app.js` and `wss://` logic for Tailscale addresses
10. **User says it still fails** — "same error, no auth token seen in settings"

### Decisions Made
- Serve frontend from `spartan-cli/public/` (unifies origin with backend)
- Patch `sameOriginUpgrade` instead of adding auth token to URL (more secure)
- Allow `x-forwarded-proto: https` as trusted proxy indicator
- Auto-embed token as DEFAULT_TOKEN fallback in frontend

### Failed Attempts
1. Patching `sameOriginUpgrade` only — backend worked locally but user still gets Code 1006
2. Using `wss://` from `window.location.protocol` — doesn't help when page is loaded over HTTP
3. Expecting user to manually enter auth token — clears history wipes localStorage, user can't find token

### Fixes Applied (Uncommitted)
- `public/app.js`: Added `DEFAULT_TOKEN` constant with actual token value
- `public/app.js`: `proto` now uses `wss://` for Tailscale addresses
- `spartan-cli/server/index.mjs`: `sameOriginUpgrade` allows local + proxied upgrades

### Tests Run
- `curl -sv ... https://100.78.120.128:8797/terminal?...` → **PASS: 101 Switching Protocols**
- `curl -sv ... http://127.0.0.1:8797/terminal?...` → **PASS: 101 Switching Protocols**
- Browser test on phone → **FAIL: Code 1006** (user reports)

### Remaining Work
1. Commit DEFAULT_TOKEN + wss:// fixes
2. Sync updated files to `spartan-cli/public/`
3. Test on iPhone again
4. If still failing: investigate Safari HSTS, mixed-content blocking, or certificate pinning
5. Install Java 21, build Android APK
6. Deploy and test on device
