# Novatix Spam Score Checker — Chrome Extension

A Manifest V3 Chrome extension that scores email subject lines and body copy for
spam triggers **before you hit send** — a direct port of the free
[Spam Score Checker](https://novatix.agency/tools/spam-score) tool on
novatix.agency.

## What it does

Paste a subject line + email body, hit **Analyze Deliverability**, and get:

- A **0–100 deliverability score** (weighted 40% subject / 60% body) with an
  SVG score ring and grade badge — **A** Inbox Tier (≥80), **B** Promo Tier
  (≥70), **C** Spam Tier (else), **F** No Content (empty input scores 0 — never
  a passing grade).
- **Subject Line Diagnostic** — length (30–50 chars ideal, hard cutoff at 78),
  ALL-CAPS detection, exclamation-mark abuse, and spam trigger words (-15 each).
- **Body Syntax Evaluation** — critical (-20 each), high (-10 each), and medium
  (-5 each) spam phrases, link density (>5 links), ALL-CAPS sections.
- **Trigger-word chips** listing every flagged keyword found in the body.
- **Top 3 fixes** — deduplicated, actionable suggestions.
- A static **SPF / DKIM / DMARC** sender-authentication checklist (educational).
- Live character counter on the subject field; word/link counter on the body.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 declaration — zero permissions, popup-only. |
| `popup.html` | Popup UI (~420 px, dark obsidian theme matching novatix.agency). |
| `popup.js` | All scoring logic + UI wiring. No external scripts, no `eval`. |
| `styles.css` | Dark theme styles. |
| `icons/icon16.png`, `icon48.png`, `icon128.png` | Extension icons (teal N on obsidian). |
| `README.md` | This file. |

## Test it (load unpacked)

1. Open Chrome → `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder
   (`~/workspace/extensions/novatix-spam-score/`).
4. Pin the extension, click its toolbar icon, and analyze a draft.
5. To remove it later: `chrome://extensions` → Remove.

## Privacy

**Fully client-side, zero data collection.** The heuristic engine runs entirely in
the popup's own JavaScript. No network requests are made — the manifest requests
no permissions (no `host_permissions`, no `tabs`, no storage). Your drafts never
leave your browser. No analytics, no cookies, no accounts.

## Notes for the publisher

- Built, **not** published. Chrome Web Store submission is a separate step
  (developer account, store listing, review).
- Logic is a 1:1 port of `~/workspace/website-src/src/pages/tools/SpamScore.jsx`
  (verified with a 16-case Node test harness — all pass), so website and
  extension scores always agree.
