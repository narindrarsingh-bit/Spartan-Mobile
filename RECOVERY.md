# Recovery Notes — UI Build

## What Happened
Attempted to write `public/index.html` with the full Discord-inspired UI.
The file was too large for one write_file call and got truncated.

## Plan
1. Write `index.html` (minimal skeleton first)
2. Write `styles.css` (Discord-inspired dark + navy/gold)
3. Write `app.js` (WebSocket connection, command send/receive)
4. Update `public/` to replace the old spartan-cli build
5. Sync Capacitor and test

## Status
- index.html: NOT written yet (truncated)
- styles.css: not started
- app.js: not started
