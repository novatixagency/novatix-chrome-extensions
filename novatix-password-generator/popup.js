'use strict';
/* ─────────────────────────────────────────────────────────────
 * Novatix Secure Password Generator — Chrome extension popup
 * Ported from novatix.agency PasswordGenerator (React tool).
 * 100% offline: crypto.getRandomValues (CSPRNG) — nothing ever
 * leaves the browser. No external scripts, no eval.
 *
 * Strength grading by Shannon entropy:
 *   entropy = length × log2(character-pool size)
 *   <50 weak · 50–80 fair · 80–110 strong · >110 excellent
 * Crack-time estimate assumes a very optimistic attacker
 * (1e10 guesses/sec) and is explicitly labeled "rough".
 * ───────────────────────────────────────────────────────────── */

const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
};
const AMBIGUOUS = new Set(['0', 'O', '1', 'l', 'I', '|']);
const MIN_LEN = 8;
const MAX_LEN = 64;
const HISTORY_LIMIT = 5;
const COPIED_FEEDBACK_MS = 2000;

/* [ASSUMPTION] 1e10 guesses/sec is an optimistic offline-attack rate used
 * only to give users an intuitive feel; real attack cost varies wildly. */
const GUESSES_PER_SECOND = 1e10;

function secureRandomInt(max) {
  /* Rejection sampling — avoids modulo bias for any pool size.
   * max is always the pool length (a small positive integer here). */
  const arr = new Uint32Array(1);
  const limit = Math.floor(4294967296 / max) * max;
  let x;
  do {
    globalThis.crypto.getRandomValues(arr);
    x = arr[0];
  } while (x >= limit);
  return x % max;
}

function buildPool(opts) {
  let pool = '';
  if (opts.upper) pool += CHAR_SETS.upper;
  if (opts.lower) pool += CHAR_SETS.lower;
  if (opts.digits) pool += CHAR_SETS.digits;
  if (opts.symbols) pool += CHAR_SETS.symbols;
  if (opts.excludeAmbiguous) pool = [...pool].filter((c) => !AMBIGUOUS.has(c)).join('');
  return pool;
}

/* Human-readable duration from seconds (very rough estimate). */
function formatCrackTime(seconds) {
  if (!Number.isFinite(seconds)) return 'effectively forever';
  if (seconds < 1) return 'instantly';
  if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 2 : 0)} second${seconds < 2 ? '' : 's'}`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(minutes < 10 ? 1 : 0)} minutes`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} hours`;
  const days = hours / 24;
  if (days < 730) return `${days.toFixed(days < 10 ? 1 : 0)} days`;
  const years = days / 365.25;
  if (years < 1e6) return `${years >= 100 ? years.toExponential(1) : years.toFixed(years < 10 ? 1 : 0)} years`;
  return `${years.toExponential(1)} years (practically uncrackable)`;
}

function gradeFor(entropy, poolSize) {
  if (poolSize <= 1) return { label: '—', color: '#859490', width: '0%' };
  if (entropy < 50) return { label: 'Weak', color: '#ef4444', width: '25%' };
  if (entropy < 80) return { label: 'Fair', color: '#ffb95f', width: '50%' };
  if (entropy < 110) return { label: 'Strong', color: '#4fdbc8', width: '75%' };
  return { label: 'Excellent', color: '#10b981', width: '100%' };
}

function crackTimeFor(entropy, poolSize) {
  if (poolSize <= 1 || entropy <= 0) return '—';
  if (entropy > 1700) return 'effectively forever';
  return formatCrackTime(Math.pow(2, entropy - 1) / GUESSES_PER_SECOND);
}

/* ── DOM wiring (every id below exists in popup.html) ── */
const $ = (id) => document.getElementById(id);
const lenSlider = $('lenSlider');
const lenValue = $('lenValue');
const toggles = {
  upper: $('tgl-upper'),
  lower: $('tgl-lower'),
  digits: $('tgl-digits'),
  symbols: $('tgl-symbols'),
  excludeAmbiguous: $('tgl-exclude'),
};
const strengthLabel = $('strengthLabel');
const strengthBar = $('strengthBar');
const entropyBits = $('entropyBits');
const poolSizeText = $('poolSizeText');
const crackText = $('crackText');
const errorBox = $('errorBox');
const generateBtn = $('generateBtn');
const resultCard = $('resultCard');
const currentPw = $('currentPw');
const copyCurrentBtn = $('copyCurrentBtn');
const historyCard = $('historyCard');
const historyList = $('historyList');

const opts = {
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
};
const history = [];

function readLength() {
  /* [ASSUMPTION] The slider already constrains 8–64, but we clamp again
   * at the boundary in case the value is set programmatically. */
  const n = Number(lenSlider.value);
  if (!Number.isFinite(n)) return 20;
  return Math.min(MAX_LEN, Math.max(MIN_LEN, Math.floor(n)));
}

function refreshStrength() {
  const length = readLength();
  const pool = buildPool(opts);
  const poolSize = pool.length;
  const entropy = poolSize > 1 ? length * Math.log2(poolSize) : 0;
  const grade = gradeFor(entropy, poolSize);

  lenValue.textContent = `${length} chars`;
  strengthLabel.textContent = grade.label;
  strengthLabel.style.color = grade.color;
  strengthBar.style.width = grade.width;
  strengthBar.style.backgroundColor = grade.color;
  entropyBits.textContent = `${entropy.toFixed(1)} bits`;
  poolSizeText.textContent = String(poolSize);
  crackText.textContent = crackTimeFor(entropy, poolSize);
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function generate() {
  clearError();
  const length = readLength();
  const pool = buildPool(opts);
  if (pool.length < 2) {
    showError('Select at least one character type (uppercase, lowercase, numbers, or symbols).');
    return;
  }
  let pw = '';
  for (let i = 0; i < length; i++) pw += pool[secureRandomInt(pool.length)];

  currentPw.textContent = pw;
  resultCard.classList.remove('hidden');

  history.unshift(pw);
  if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach((pw, idx) => {
    const row = document.createElement('div');
    row.className = 'pw-row';

    const span = document.createElement('span');
    span.className = 'pw mono';
    span.textContent = pw;
    row.appendChild(span);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', `Copy history password ${idx + 1}`);
    btn.innerHTML = '&#128203;';
    btn.addEventListener('click', () => copyText(pw, btn));
    row.appendChild(btn);

    historyList.appendChild(row);
  });
  historyCard.classList.toggle('hidden', history.length === 0);
}

function copyText(text, btn) {
  const done = () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '&#10003;';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, COPIED_FEEDBACK_MS);
  };
  const fallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch {
      showError('Copy failed — please select and copy the password manually.');
    }
  };
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(done, fallback);
  } else {
    fallback();
  }
}

/* Toggle switches */
Object.keys(toggles).forEach((key) => {
  const el = toggles[key];
  el.addEventListener('click', () => {
    opts[key] = !opts[key];
    el.setAttribute('aria-checked', String(opts[key]));
    el.classList.toggle('on', opts[key]);
    refreshStrength();
  });
  el.classList.toggle('on', opts[key]); // initial state matches opts
});

lenSlider.addEventListener('input', refreshStrength);
generateBtn.addEventListener('click', generate);
copyCurrentBtn.addEventListener('click', () => copyText(currentPw.textContent, copyCurrentBtn));

refreshStrength(); // initial meter state
