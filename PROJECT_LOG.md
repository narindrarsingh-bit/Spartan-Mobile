# Spartan CLI — Project Log

## 2026-06-26 — Project Initialization

### Goal
Build a Capacitor native wrapper for the Spartan CLI web terminal, keeping everything in `~/Documents` for hygiene.

### Rules Applied
- Repo-local files: README.md, CURRENT_STATE.md, PROJECT_LOG.md
- Git as durable truth surface
- All work in `~/Documents/spartan-native`

### Commands Run
```bash
mkdir -p ~/Documents/spartan-native
cd ~/Documents/spartan-native
git init
npx @capacitor/cli init "Spartan CLI" com.roy.spartancli web --web-dir=public
npm install @capacitor/android @capacitor/core @capacitor/ios
npx @capacitor/cli add android
npx @capacitor/cli add ios
mkdir -p public
cp -r ~/Documents/spartan-cli/dist/* public/
npx @capacitor/cli sync
```

### Decisions
- Capacitor v7 for native platforms (CLI v8.x)
- Android + iOS platforms added (iOS builds only on macOS)
- Web build copied from existing spartan-cli/dist/
- No custom plugins added yet (network detection is optional)
- Using `capacitor.config.json` with `webDir: "public"` and HTTPS schemes

### Next Steps
1. Build test on Android (or Android Studio)
2. Build test on iOS (or Xcode, requires macOS)
3. Customize icon and splash screen
4. Sideloading test on device
5. Update Brain note after first successful build
