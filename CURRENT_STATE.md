# Spartan CLI — Native Wrapper

## Current State (2026-06-26 — session end)

### What Works
- Capacitor scaffold: `android/` and `ios/` platform folders generated
- Git repo initialized with 4 commits
- `public/index.html`: App shell with header, output, input, settings panel
- `public/icon.png`: App icon present
- `capacitor.config.json`: Properly configured for Capacitor v7
- `package.json`: Dependencies and build scripts in place

### What Does Not Work (Needs Fixing)
- **`public/styles.css` is incomplete**: Has `:root` variables + header + output area only (161 lines). Missing input area, settings panel, and toast styles.
- **`public/app.js` has null reference bug**: Line 15 gets `#profile-select` element that doesn't exist in HTML. Subsequent `.addEventListener` calls throw, breaking init.
- **WebSocket connection fails on iPhone**: Grey screen observed. Caused by JS error from null `profileSelect`, incomplete CSS, and likely iOS Safari cache.
- **Android build blocked**: Java 25/26 on Fedora, Gradle needs Java 17 or 21.
- **iOS build impossible**: No macOS environment.

### Exact Run/Build Status
```
$ cd ~/Documents/spartan-native
$ npm run build-android  → FAILS (Java version mismatch)
$ python3 -m http.server 9000 --directory public  → serves assets but UI broken
$ iPhone Safari → http://100.78.120.128:9000  → grey screen
$ npx cap sync  → works (android/ios generated)
```

### Files Summary
| File | Lines | Status |
|------|-------|--------|
| `public/index.html` | 72 | Complete, but missing profile-select |
| `public/styles.css` | 161 | INCOMPLETE — missing ~40% |
| `public/app.js` | 219 | Has null-ref bug on profileSelect |
| `public/icon.png` | 37KB | OK |
| `capacitor.config.json` | 16 | OK |
| `package.json` | 16 | OK |
| `.gitignore` | present | OK |
| `HANDOFF.md` | 52 | NEW — session handoff |
