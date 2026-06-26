# Spartan CLI — Project Log

## 2026-06-26 — Project Initialization

### Goal
Build a Capacitor native wrapper for the Spartan CLI web terminal, keeping everything in `~/Documents` for hygiene.

### Rules Applied
- Repo-local files: README.md, CURRENT_STATE.md, PROJECT_LOG.md
- Git as durable truth surface
- All work in `~/Documents/spartan-native`
- Spartan CLI source is read-only (copy dist/, never modify)

### Commands Run
```bash
mkdir -p ~/Documents/spartan-native
git init
npx @capacitor/cli init "Spartan CLI" com.roy.spartancli web --web-dir=public
npm install @capacitor/android @capacitor/core @capacitor/ios
npx @capacitor/cli add android
npx @capacitor/cli add ios
npx @capacitor/cli sync
```

### Decisions
- Capacitor v8 for native platforms
- Android + iOS platforms added
- Web build copied from existing spartan-cli/dist/ (read-only)

## 2026-06-26 — UI Redesign

### Goal
Replace raw terminal look with a polished, Discord-inspired UI that looks like a legitimate productivity app.

### Design Direction
- **Palette**: Navy blue (#2b2d31) + gold (#d4a843) accents
- **Layout**: Discord-style — header bar + scrollable output + bottom command input bar
- **Input bar**: Rounded, gold glow on focus, submit button — looks like a chat app, not a terminal
- **Settings panel**: Slide-up bottom sheet for server address, auth token, font size
- **Toast notifications**: Connection status feedback
- **Persistence**: Settings saved to LocalStorage

### Files Created
- `public/index.html` — App shell (header, output area, input bar, settings panel)
- `public/styles.css` — Full CSS with CSS variables, dark theme, responsive layout
- `public/app.js` — WebSocket connection, auto-reconnect, command sending, settings management

### Architecture
- WebSocket connects to `ws://<server>:8797/ws`
- Messages: `{ type: "command", content: "..." }` → server
- Server responds: `{ type: "output"|"error"|"auth-ok"|"auth-fail", content: "..." }`
- Auto-reconnect every 3s on disconnect
- All settings persisted in localStorage

### Next Steps
1. Test on iPhone via Safari (load `public/index.html` from Fedora server)
2. Build Android APK for sideload test
3. Push to GitHub + set up macOS CI workflow for IPA builds
4. Customize icon and splash screen
5. Update Brain note after successful device test
