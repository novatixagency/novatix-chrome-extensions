# Novatix JSON Formatter & Validator — Chrome Extension

A port of the [Novatix Agency](https://novatix.agency/tools/) JSON formatter web tool to a Manifest V3 Chrome extension.

## What it does

- **Format** — pretty-print JSON with 2-space indentation.
- **Minify** — strip all unnecessary whitespace; reports characters saved and % smaller.
- **Validate** — parse in a strict `try/catch`; on error extracts the position from the message (`position N` or `line X column Y`), converts char offsets to line/column, and shows `message → line L, column C`.
- **Syntax highlighting** — keys (teal `#4fdbc8`), strings (amber `#ffb95f`), numbers (green `#10b981`), `true`/`false`/`null` (purple `#c792ea`).
- **Sample / Clear** buttons; the sample is the same Novatix Agency object used on the website.
- **Stats row** — character count, line count, structure (`Array · N items` / `Object · N keys · depth D` / `Primitive · type`).
- **Copy** — `navigator.clipboard` with an `execCommand` fallback.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 declaration (`action.default_popup: popup.html`, icons, empty permissions) |
| `popup.html` | Popup markup — width ~480px, dark obsidian theme |
| `popup.js` | All logic; no external scripts, no `eval`/`new Function`, no `console` calls |
| `styles.css` | Dark theme, monospace editor, buttons, status colors |
| `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` | Icons resized from the official Novatix website logo (`~/workspace/website-src/public/logo.png`) via PIL |
| `README.md` | This file |

## How to test

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this directory (`novatix-json-formatter/`).
4. Pin the extension, then click its toolbar icon to open the popup.
5. Click **Sample** → **Format** (green success + highlighted output), **Minify** (saved-chars report), **Validate** (valid type report).
6. Test error reporting: change the sample so a trailing comma exists (e.g. `"tools",`) → **Validate** → expect a red status with `→ line L, column C`.
7. Test empty input: **Clear** → **Format** → friendly error, no crash.
8. **Copy** → label changes to "Copied!"; paste to verify.

## Privacy

Fully offline. No permissions requested (empty `permissions` array in `manifest.json`). No network calls, no analytics, no data collection. Pasted JSON never leaves your browser.

## Assumptions / notes

- The icons were generated from the current website logo; if the brand logo changes, regenerate from the same source path.
- `popup.js` was unit-tested headless in Node (helpers: `escapeHtml`, `highlightJson`, `positionToLineCol`, `extractPosition`, `maxDepth`) — see verification below. DOM wiring was verified by matching every `getElementById` target against `popup.html` IDs.
