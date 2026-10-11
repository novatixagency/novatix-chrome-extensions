# Novatix Secure Password Generator — Chrome Extension (MV3)

A cryptographically secure password generator, ported from the [Novatix Agency web tool](https://novatix.agency/tools/password-generator). Runs 100% offline inside the browser — nothing ever leaves your machine.

## What it does

- Generates random passwords with `crypto.getRandomValues` (CSPRNG) + bias-free rejection sampling — never `Math.random`.
- Character sets: uppercase, lowercase, digits, symbols (toggleable), plus an "exclude ambiguous characters" toggle (0/O, 1/l/I).
- Length slider: 8–64 chars (default 20), clamped at the boundary.
- Live strength meter: entropy bits = length × log₂(pool size); grades Weak / Fair / Strong / Excellent.
- Rough crack-time estimate (assumes a very optimistic 10 billion guesses/sec; labeled "rough estimate").
- Generate one password at a time; keeps a history of the last 5 (in-memory only, never stored on disk), each with a copy button.
- Dark obsidian theme matching the Novatix site.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 declaration, zero permissions requested |
| `popup.html` | Popup markup (380px wide) |
| `popup.js` | All logic — CSPRNG generation, entropy/strength/crack-time math, copy |
| `styles.css` | Obsidian theme, toggle switches, slider, strength meter |
| `icons/icon{16,48,128}.png` | Extension icons (cropped from the Novatix logo) |
| `README.md` | This file |

## How to test

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Enable **Developer mode** (toggle, top right).
3. Click **Load unpacked** and select this folder (`~/workspace/extensions/novatix-password-generator/`).
4. Click the extension's toolbar icon (pin it if you like). The popup opens — no console errors expected.
5. Test checklist:
   - Move the length slider → strength meter, entropy bits, pool size, and crack time update live.
   - Untick all character sets → Generate shows the "select at least one character type" error.
   - Generate → password appears large; copy button shows ✓ for 2 seconds.
   - Generate 6 times → history shows the last 5.
   - Footer "More free tools →" opens https://novatix.agency/tools/ in a new tab.

## Privacy

- **Zero data collection.** No analytics, no network requests, no storage.
- Passwords exist only in popup memory while the popup is open; closing the popup discards them.
- The extension requests **no permissions** (`"permissions": []`) and contains **no remote code** — compliant with Chrome Web Store policy.

## Porting notes

Logic ported 1:1 from `~/workspace/website-src/src/pages/tools/PasswordGenerator.jsx` (CHAR_SETS, AMBIGUOUS, `secureRandomInt` rejection sampling, entropy grades, `formatCrackTime`). Popup adaptation: generates one password at a time (web version generates up to 20), and history is kept in-memory instead of on-screen multi-list.
