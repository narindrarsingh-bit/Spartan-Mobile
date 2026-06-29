# Spartan Native — Project Log

## 2026-06-27 — Session: iPhone Composer Layout Loop Paused

### Goal
Fix the native-wrapper iPhone composer/chat box placement without breaking the left rail or recreating the visual "L" at the bottom.

### What Happened
1. Reconfirmed that the real Spartan CLI and the native wrapper are separate:
   - Real CLI: `8797`
   - Native-wrapper preview: `9002`
2. Restored/kept the real CLI route separate and did not touch the CLI for the composer issue.
3. Moved the native-wrapper layout away from flex/grid bottom-row ownership toward fixed/absolute ownership:
   - `#app` fixed to the viewport
   - `.sidebar` absolute from top to bottom on the left
   - `.main` absolute beside the rail
   - `.composer-dock` absolute at the bottom of the main column
4. Changed manifest/native fallback colors to the main panel gray `#313338`, after black/body fallback showed up as a bad bottom strip.
5. Roy reported the left bar is now right.
6. Composer vertical placement is still not final. Blind bottom-padding nudges became counterproductive.
7. One worse tweak lowered mobile composer padding from `8px` to `5px` and changed `.composer-dock` to `pointer-events: auto`; it was reverted.

### Current State
- Left rail/strip: correct by Roy's report.
- Composer: close but unresolved; do not call it fixed.
- Tap/type behavior: must be rechecked on device before further CSS changes.
- `9002` preview server is currently running.
- `8797` remains the real Spartan CLI and is separate.

### Decision
Pause the CSS pixel loop. Resume only with Android Studio/device/WebView evidence: viewport bounds, safe-area/home-indicator area, composer box geometry, and tap target/focus behavior.

### Files Changed In This Area
- `public/index.html`
- `public/styles.css`
- `public/manifest.json`
- `ios/App/App/AppDelegate.swift`

### Do Not Repeat
- Do not preserve the bottom leg of the L; Roy said it can go.
- Do not use background paint tricks to hide layout gaps.
- Do not blindly move the composer up/down without checking real WebView bounds.
- Do not touch the Spartan CLI for this native-wrapper layout issue.

## 2026-06-27 — Session: iPhone Trust Profile Static Route

### Goal
Make the Spartan HTTPS trust material reachable from the same phone-facing static app used for iPhone Safari testing.

### What Happened
1. Verified `http://100.78.120.128:9002/` serves the native app
2. Verified `http://100.78.120.128:9002/spartan-ca.mobileconfig` and `/spartan-ca.cer` returned 404
3. Copied existing public CA/profile files from `/home/roy/.config/spartan-cli/tls/` into `public/`
4. Added settings modal links for profile/cert download

### Files Changed
- `public/spartan-ca.mobileconfig`: existing Spartan CA profile copied into static app
- `public/spartan-ca.cer`: existing Spartan CA certificate copied into static app
- `public/index.html`: added settings links
- `public/styles.css`: styled trust links
- `CURRENT_STATE.md`, `HANDOFF.md`, `PROJECT_LOG.md`: updated handoff state

### Remaining Work
1. Retest thread panel on iPhone Safari over Tailscale
2. If thread creation still disconnects, capture Safari/device behavior and backend logs

## 2026-06-27 — Session: Restore Real Spartan CLI Port

### Goal
Stop the native-wrapper preview from masking the real Spartan CLI.

### What Happened
1. Verified multiple stale native preview servers were still running on `8798`, `9000`, `9001`, and `9002`
2. Verified `spartan-cli/dist/index.html` had native-wrapper markup
3. Rebuilt `/home/roy/Documents/spartan-cli` with `npm run check`, restoring the real Spartan CLI bundle in `dist/`
4. Killed the stale Python preview servers
5. Verified `http://127.0.0.1:8797/` and `https://100.78.120.128:8797/` serve `Spartan CLI`
6. Verified `9002` no longer answers

### Decision
Use `8797` for the real Spartan CLI. Treat `9002` as a temporary native-wrapper preview only.

## 2026-06-26 — Session: Fix Frontend Blockers + Test UI (Previous Session)

### Goal
Fix frontend blockers (profile-select null ref, incomplete CSS), test web UI locally, prepare for Android build.

### Completed
1. Fixed profile-select null reference in `index.html`
2. Completed `styles.css` (398 lines, three incremental patches)
3. Tested web UI: loads without errors, all UI components render correctly
4. Committed frontend fixes to git

## 2026-06-26 — Session: WebSocket Debug + Handoff (Previous Session)

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

## 2026-06-26 — Session: Apply + Commit WebSocket Fixes (Current Session)

### Goal
Apply the DEFAULT_TOKEN + wss:// fixes to canonical public/app.js, sync to spartan-cli/public/, verify services, and commit.

### What Happened
1. Read HANDOFF.md, CURRENT_STATE.md, PROJECT_LOG.md — identified architecture and pending fixes
2. Read `public/app.js` — confirmed fixes were already applied on disk (DEFAULT_TOKEN line 7, fallback line 94, wss:// line 96, console.log line 99)
3. Synced `spartan-native/public/` to `spartan-cli/public/` via rsync — 5 files synced
4. Verified services: `spartan-cli.service` active (PID 300076), `spartan-cli-https.service` active (PID 2809)
5. Verified Python dev server on port 9002 (PID 313693) serving correct app.js
6. Confirmed fixes served on both localhost and Tailscale IP via curl
7. Verified backend /api/health endpoint — returns session data, auth enabled, token matches
8. Investigated backend code (`server/index.mjs`):
   - `sameOriginUpgrade` allows local + proxied connections
   - `authorizedUpgrade` validates token from URL params for remote requests
9. Investigated proxy code (`server/https-proxy.mjs`):
   - HTTPS termination on `100.78.120.128:8797`
   - Raw TCP relay for WebSocket upgrades via `proxyUpgrade`
10. Read README.md — noted dev server port was documented as 9001 but running on 9002
11. Updated documentation files
12. Committed changes with message: "Fix WebSocket: add default auth token and wss:// for Tailscale"

### Files Changed
- `public/app.js`: +4/-2 lines (DEFAULT_TOKEN, token fallback, wss:// logic, debug log)
- `HANDOFF.md`: complete rewrite with current state
- `CURRENT_STATE.md`: updated with commit status and service PIDs
- `PROJECT_LOG.md`: added current session entry
- `README.md`: minor update noting fixes are committed

### Tests Run
- `curl http://127.0.0.1:9002/app.js | grep DEFAULT_TOKEN` → 2 matches (constant + fallback)
- `curl http://127.0.0.1:9002/app.js | grep wss://` → 1 match (protocol logic)
- `curl http://100.78.120.128:9002/app.js | grep DEFAULT_TOKEN` → identical on Tailscale IP
- `diff spartan-native/public/ spartan-cli/public/` → identical
- `curl http://127.0.0.1:8797/api/health?token=...` → backend responds, auth enabled

### Commit
```
67dff49 Fix WebSocket: add default auth token and wss:// for Tailscale
```

### Remaining Work
1. ~~Test on iPhone~~ — DONE (2026-06-26)
2. ~~If still failing: use Safari Web Inspector~~ — Not needed, connection works
3. Install Java 21, build Android APK
4. Deploy and test on device

## 2026-06-26 — Session: iPhone Retest + Status Update

### Goal
Retest WebSocket on iPhone after DEFAULT_TOKEN + wss:// fixes.

### Result
- Dev server on :9002 was down — restarted (PID 441648)
- iPhone Safari test: **PASSED** — WebSocket connects successfully over Tailscale
- Code 1006 resolved. Root cause was missing auth token in WebSocket URL.
- Docs updated, committed as `b53dbef`.

## 2026-06-26 — Session: Full Frontend Redesign — Discord-like UX

### Goal
Rewrite the mobile web frontend to look like Discord and fix the "can't type" UX issue. User feedback: "the mobile ux is really bad. u cant type yet." and "it was also supposed to look like discord".

### What Happened
1. Read and analyzed existing public/index.html, styles.css, app.js
2. Read backend server/index.mjs to understand WebSocket message protocol
3. Full HTML rewrite:
   - Profile tabs (shell/qwen/hermes) as Discord-style channel tabs
   - viewport-fit=cover for notch device safe areas
   - enterkeyhint="send" for mobile keyboard send button
   - Settings panel overlay with server address + token inputs
   - Status dot indicator
4. Full CSS rewrite:
   - Discord dark theme palette (#313338 / #2b2d31 / #5865f2)
   - 100dvh height for iOS keyboard behavior (prevents viewport collapse)
   - Profile tabs as horizontal channel-like buttons
   - Message-style output area with scroll
   - Bottom-fixed input bar with send button
   - Floating settings FAB button
   - Settings panel slide-in overlay
   - Toast notifications
5. Full JS rewrite (IIFE, strict mode):
   - `getDefaultServer()` — smart default server detection:
     - localhost/127.0.0.1 → ws://127.0.0.1:8797
     - Tailscale IPs → wss://100.78.120.128:8797
   - DEFAULT_TOKEN fallback so users don't manually enter auth
   - WebSocket protocol selection (wss:// for Tailscale, ws:// for localhost)
   - ANSI escape stripping: CSI sequences + OSC sequences (BEL/ST terminators)
   - Profile tab switching with automatic reconnect
   - Queued writes on disconnect (replay on reconnect)
   - localStorage persistence for server/token/profile
   - Settings panel with connect/reconnect button
   - 3-second reconnect backoff on failure
6. Key fix: replaced hardcoded DEFAULT_SERVER with dynamic getDefaultServer() function
   - Desktop dev now works on localhost without code changes
   - Mobile on Tailscale uses wss:// automatically
7. Desktop browser test: ALL PASSED
   - WebSocket connects to 127.0.0.1:8797
   - Commands send and output returns (tested: echo hello from spartan)
   - ANSI codes stripped cleanly (Spartan logo renders)
   - Profile switching works (shell → qwen → hermes)
   - Settings panel opens/closes
   - localStorage persists correctly
   - Zero JS errors in console
8. HTML validate: passed (2 info-level hints only)
9. JS syntax check: passed

### Files Changed
- `public/index.html`: Full rewrite (~84 lines changed)
- `public/styles.css`: Full rewrite (~367 lines changed)
- `public/app.js`: Full rewrite (~160 lines changed)
- `HANDOFF.md`: Updated with new architecture and verified status
- `CURRENT_STATE.md`: Updated with redesign status
- `PROJECT_LOG.md`: Added this session entry
- `README.md`: Updated status

### Tests Run
- `node -c public/app.js` → syntax OK
- `html-validate public/index.html` → passed
- Browser test on http://127.0.0.1:9002:
  - WebSocket connected (status dot green)
  - Command sent: "echo hello from spartan" → command echoed + output received
  - Profile switch: shell → qwen → connected to qwen profile
  - Settings panel: opened, fields populated, close works
  - Console: zero errors
  - Output: ANSI codes stripped cleanly

### Remaining Work
1. ~~Desktop browser test~~ — DONE
2. ~~ANSI stripping~~ — DONE (CSI + OSC)
3. ~~Profile switching~~ — DONE
4. ~~Settings panel~~ — DONE
5. ~~Smart server detection~~ — DONE
6. ~~Discord-style sidebar redesign~~ — DONE (HTML/CSS/JS complete, desktop tested)
7. ~~Improved ANSI strip (xterm > variants, space params, scroll-up)~~ — DONE
8. **Test new frontend on iPhone over Tailscale** — PENDING (current blocker)
9. **Mobile viewport test** — PENDING (keyboard input, scroll behavior on device)
10. Android build — BLOCKED (Java version)
11. iOS native build — BLOCKED (no macOS)

## 2026-06-27 — Session: Fix Agent Communication + Claude-code Profile

### Goal
Fix broken agent communication in the new sidebar frontend.

### What Happened
1. Diagnosed: `sendInput` in `app.js` sent `type: "input"` without `\r`, so commands were typed into the PTY but never submitted/executed
2. Verified with raw WebSocket test: `type: "input"` without `\r` types text but doesn't execute; with `\r` appended it works
3. Fixed `public/app.js`: `sendInput` now sends `cmd + "\r"` (also updates queued writes so replay works)
4. Found secondary bug: `normalizeProfile` in `server/index.mjs` didn't include `claude-code`, so Claude tabs fell back to plain shell
5. Fixed `server/index.mjs`: added `claude-code` to the valid profile list
6. Verified both fixes via raw WebSocket tests: codex echo works, claude-code session correctly spawns "Claude Code" title
7. Synced `spartan-native/public/` → `spartan-cli/public/` via rsync
8. Restarted `spartan-cli.service` to pick up backend fix
9. Verified backend health OK after restart

### Files Changed
- `public/app.js`: +2/-2 lines (sendInput appends \r, queued writes include \r)
- `../spartan-cli/server/index.mjs`: +1/-1 line (normalizeProfile includes claude-code)
- `CURRENT_STATE.md`: updated
- `PROJECT_LOG.md`: added this session entry

### Tests Run
- Raw WebSocket: `type: "input"` + `\r` → echo works
- Raw WebSocket: `type: "input"` without `\r` → text typed but not executed (confirmed bug)
- Raw WebSocket: `profile=claude-code` → session spawns as "Claude Code" (confirmed fix)
- `node -c public/app.js` → syntax OK
- `curl /api/health` → backend OK after restart
- `rsync` → spartan-cli/public/ synced

### Remaining Work
1. **Test new frontend on iPhone over Tailscale** — PENDING (current blocker)
2. Android build — BLOCKED (Java version)
3. iOS native build — BLOCKED (no macOS)

## 2026-06-27 — Session: Thread Panel + Multi-Session UX

### Goal
Add Discord-style thread panel for multiple concurrent agent instances per agent. UX: tap agent → panel slides out → + button creates new thread → long press circle → wiggle + X to close.

### What Happened
1. **HTML**: Added `<aside class="thread-panel">` between sidebar and main area
   - Header showing agent initial, thread list container populated by JS
2. **CSS**: Thread panel styles (~120 lines added)
   - `.thread-panel`: 0/64px width with transition, dark background (#2b2d31)
   - `.thread-circle`: 40px circles, active pill indicator, hover/active states
   - `.thread-add`: 40px green circle with + SVG
   - `@keyframes wiggle`: iOS-style rotation animation
   - `.wiggling .thread-close`: red X close buttons appear during wiggle
   - Mobile responsive: 52px panel, 36px circles, compact X buttons
3. **JS**: Full rewrite for multi-session architecture (~360 lines)
   - Thread state: `threads[agentId] = [{id, ws, lines, status, ...}]`
   - `createThread(agent)`: new WebSocket with unique `session=native-<uuid>`
   - `switchToThread(thread)`: restore thread's buffer to output area
   - `closeThread(thread)`: kill WebSocket, remove from state, auto-switch
   - Long press detection: `pointerdown` timer → `enterWiggleMode()` at 500ms
   - Wiggle mode: `.wiggling` class on panel, X buttons visible, tap anywhere to exit
   - Thread panel toggle: tap agent → open, tap again → close, tap different → switch
   - Settings save reconnects active thread
4. Verified: 2 concurrent Codex WebSocket sessions work independently
5. Synced to `spartan-cli/public/`

### Files Changed
- `public/index.html`: removed inline script tag, added thread panel HTML
- `public/styles.css`: +~120 lines (thread panel, circles, +, wiggle, X, mobile)
- `public/app.js`: full rewrite (multi-session, thread lifecycle, wiggle UX)
- `CURRENT_STATE.md`: updated
- `PROJECT_LOG.md`: added this session entry

### Tests Run
- `node -c public/app.js` → syntax OK
- Multi-session WebSocket: 2 threads → both receive independent output
- `curl /health` → backend OK
- `rsync` → spartan-cli/public/ synced
- Dev server serving correct files on :9002

### Remaining Work
1. **Test thread panel on desktop browser** — PENDING
2. **Test thread panel on iPhone over Tailscale** — PENDING (current blocker)
3. Android build — BLOCKED (Java version)
4. iOS native build — BLOCKED (no macOS)

## 2026-06-29 — Session: OpenCode -c flag + Spartan CLI bottom fix + documentation

### Goal
Make Spartan-launched OpenCode sessions resume the last conversation instead of starting fresh. Fix Spartan CLI bottom clipping. Document backend changes for agent visibility.

### What Happened
1. **OpenCode `-c` flag**: Added to Spartan backend `server/index.mjs` OpenCode profile args. OpenCode sessions launched from Spartan now use `-c` (continue last session) flag, reading from `~/.local/share/opencode/opencode.db`.
2. **Spartan CLI bottom fix**: Changed mobile `.shell` CSS `padding-bottom` from `0` to `28px` in `spartan-cli/src/styles.css`. Also added `height: 100%; overflow: hidden` to `html,body,#app` and `overflow: hidden` to `.shell`. Rebuilt Vite dist. Service restarted.
3. **Documentation**: Updated CURRENT_STATE.md with "Backend Changes (unversioned)" section so all agents know the `-c` flag is active and sessions persist across Spartan launches.
4. **DeepSeek auth fix** (earlier): Spartan needed restart after EnvironmentFile drop-in was created.

### Files Changed
- `../spartan-cli/server/index.mjs`: OpenCode args +`-c`
- `../spartan-cli/src/styles.css`: mobile bottom padding 28px, height/overflow fixes
- `CURRENT_STATE.md`: added backend changes section
- `PROJECT_LOG.md`: added this entry
