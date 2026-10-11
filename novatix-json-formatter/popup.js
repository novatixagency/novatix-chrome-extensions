'use strict';
/* Novatix JSON Formatter & Validator — popup logic.
 * Ported from ~/workspace/website-src/src/pages/tools/JsonFormatter.jsx.
 * Manifest V3: no eval, no new Function, no remote code, no console logging. */

/* ── helpers ── */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Simple regex-based syntax highlighter: keys teal, strings amber, numbers green, booleans/null purple.
 * User input is HTML-escaped FIRST, so the injected <span> tags are the only markup. */
function highlightJson(json) {
  const esc = escapeHtml(json);
  return esc.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|-?\b\d+(\.\d+)?([eE][+-]?\d+)?\b|\b(true|false|null)\b/g,
    // [ASSUMPTION] Fix vs. website source: JsonFormatter.jsx maps the replace()
    // callback args to 6 capture groups, but the regex only defines 5 — the 6th
    // arg is actually the match offset (always truthy), so plain integers were
    // styled purple (bool) instead of green (number). Corrected here per spec.
    (m, str, colon, _frac, _exp, bool) => {
      if (str) {
        const cls = colon ? 'tok-key' : 'tok-str';
        return '<span class="' + cls + '">' + str + '</span>' + (colon || '');
      }
      if (bool) return '<span class="tok-bool">' + m + '</span>';
      return '<span class="tok-num">' + m + '</span>';
    }
  );
}

function positionToLineCol(text, pos) {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === '\n') { line++; col = 1; } else { col++; }
  }
  return { line, col };
}

function extractPosition(message) {
  const m = message.match(/[Pp]osition\s+(\d+)/) || message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (!m) return null;
  if (m[2]) return { line: parseInt(m[1], 10), col: parseInt(m[2], 10) };
  return { pos: parseInt(m[1], 10) };
}

function maxDepth(v, d) {
  d = d === undefined ? 0 : d;
  if (Array.isArray(v)) return v.length ? 1 + Math.max.apply(null, v.map(function (x) { return maxDepth(x, d); })) : d + 1;
  if (v && typeof v === 'object') {
    const vals = Object.values(v);
    return vals.length ? 1 + Math.max.apply(null, vals.map(function (x) { return maxDepth(x, d); })) : d + 1;
  }
  return d;
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

/* Same sample object as the website tool (Novatix Agency object). */
const SAMPLE = JSON.stringify({
  name: 'Novatix Agency', active: true, founded: 2024,
  tags: ['tools', 'api', 'seo'],
  pricing: { trial: 0, standard: 100, premium: 250 },
  contact: { email: 'info@novatix.agency', verified: null },
}, null, 2);

/* ── state ── */

let outputText = '';
let copyTimer = null;

function $(id) { return document.getElementById(id); }

/* ── rendering ── */

function setStatus(ok, message) {
  const bar = $('status-bar');
  const msg = $('status-message');
  bar.classList.remove('status-hidden', 'status-ok', 'status-err');
  bar.classList.add(ok ? 'status-ok' : 'status-err');
  msg.textContent = message;
}

function hideStatus() {
  $('status-bar').classList.add('status-hidden');
}

function renderOutput(text) {
  outputText = text;
  const section = $('output-section');
  if (text) {
    $('output-code').innerHTML = highlightJson(text);
    section.classList.remove('output-hidden');
    updateStats(text);
  } else {
    section.classList.add('output-hidden');
    updateStats('');
  }
  resetCopyLabel();
}

function updateStats(text) {
  const input = $('json-input').value;
  $('stat-chars').textContent = input.length.toLocaleString('en-US');
  $('stat-lines').textContent = (input ? input.split('\n').length : 0).toLocaleString('en-US');
  let structure = '—';
  const source = text || input;
  if (source.trim()) {
    try {
      const v = JSON.parse(source);
      if (Array.isArray(v)) {
        structure = 'Array · ' + v.length + ' item' + (v.length === 1 ? '' : 's');
      } else if (v && typeof v === 'object') {
        const keys = Object.keys(v).length;
        structure = 'Object · ' + keys + ' key' + (keys === 1 ? '' : 's') + ' · depth ' + maxDepth(v);
      } else {
        structure = 'Primitive · ' + typeof v;
      }
    } catch (e) {
      structure = '—';
    }
  }
  $('stat-structure').textContent = structure;
}

function errorDetail(e, input) {
  const loc = extractPosition(e.message);
  if (loc && loc.pos !== undefined) {
    const lc = positionToLineCol(input, loc.pos);
    return e.message + ' → line ' + lc.line + ', column ' + lc.col;
  }
  return e.message;
}

/* ── actions ── */

function guardEmpty(actionLabel) {
  const input = $('json-input').value;
  if (!input.trim()) {
    renderOutput('');
    setStatus(false, 'Input is empty — paste some JSON to ' + actionLabel + '.');
    return null;
  }
  return input;
}

function runFormat() {
  const input = guardEmpty('format');
  if (input === null) return;
  try {
    const v = JSON.parse(input);
    renderOutput(JSON.stringify(v, null, 2));
    setStatus(true, 'Formatted with 2-space indentation.');
  } catch (e) {
    renderOutput('');
    setStatus(false, errorDetail(e, input));
  }
}

function runMinify() {
  const input = guardEmpty('minify');
  if (input === null) return;
  try {
    const v = JSON.parse(input);
    const min = JSON.stringify(v);
    renderOutput(min);
    const saved = input.length - min.length;
    const pct = input.length > 0 ? Math.round(saved / input.length * 100) : 0;
    setStatus(true, 'Minified. Saved ' + saved.toLocaleString('en-US') + ' characters (' + pct + '% smaller).');
  } catch (e) {
    renderOutput('');
    setStatus(false, errorDetail(e, input));
  }
}

function runValidate() {
  const input = guardEmpty('validate');
  if (input === null) return;
  try {
    const v = JSON.parse(input);
    renderOutput(JSON.stringify(v, null, 2));
    const type = Array.isArray(v) ? 'array' : (v && typeof v === 'object' ? 'object' : typeof v);
    setStatus(true, 'Valid JSON (' + type + ').');
  } catch (e) {
    renderOutput('');
    setStatus(false, errorDetail(e, input));
  }
}

function resetCopyLabel() {
  if (copyTimer) { clearTimeout(copyTimer); copyTimer = null; }
  $('copy-label').textContent = 'Copy';
}

function handleCopy() {
  if (!outputText) return;
  copyText(outputText).then(function (ok) {
    $('copy-label').textContent = ok ? 'Copied!' : 'Copy failed';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(resetCopyLabel, 2000);
  });
}

function handleClear() {
  $('json-input').value = '';
  renderOutput('');
  hideStatus();
}

function handleSample() {
  $('json-input').value = SAMPLE;
  renderOutput('');
  hideStatus();
}

/* ── wiring ── */

document.addEventListener('DOMContentLoaded', function () {
  $('btn-format').addEventListener('click', runFormat);
  $('btn-minify').addEventListener('click', runMinify);
  $('btn-validate').addEventListener('click', runValidate);
  $('btn-sample').addEventListener('click', handleSample);
  $('btn-clear').addEventListener('click', handleClear);
  $('btn-copy').addEventListener('click', handleCopy);
  $('json-input').addEventListener('input', function () { updateStats(outputText); });
});
