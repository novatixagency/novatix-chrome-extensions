/* Novatix Spam Score Checker — popup.js
 * Manifest V3 popup script. Pure heuristic analysis, fully client-side.
 * No remote calls, no eval, no external scripts.
 */
'use strict';

/* ── Spam trigger words database (ported 1:1 from novatix.agency tool) ── */
const SPAM_WORDS = {
  critical: [
    'free money', 'get rich', 'make money fast', 'no cost', '100% free',
    'guaranteed income', 'double your income', 'earn extra cash',
  ],
  high: [
    'free', 'guarantee', 'guaranteed', 'winner', 'prize', 'cash',
    'urgent', 'act now', 'limited time', 'hurry',
    'click here', 'buy now', 'order now', 'call now',
    'risk-free', 'no risk', 'amazing deal', 'incredible deal',
    'congratulations', 'dear friend', 'once in a lifetime',
  ],
  medium: [
    'discount', 'sale', 'offer', 'deal', 'save', 'cheap',
    'miracle', 'secret', 'shocking', 'trial', 'sample', 'bonus',
  ],
};

/* ── Analysis functions (ported 1:1 from novatix.agency tool) ── */
function analyzeSubject(subject) {
  const issues = [];
  const suggestions = [];
  let score = 100;
  const trimmed = subject.trim();
  const len = trimmed.length;

  if (len === 0) {
    issues.push({ type: 'error', text: 'Subject line is empty' });
    score -= 40;
  } else if (len < 30) {
    issues.push({ type: 'warning', text: 'Too short (' + len + ' chars). Aim for 30-50 characters.' });
    suggestions.push('Add more descriptive words to your subject line');
    score -= 10;
  } else if (len > 78) {
    issues.push({ type: 'error', text: 'Too long (' + len + ' chars). Will be cut off in most email clients.' });
    suggestions.push('Shorten to under 50 characters for best results');
    score -= 20;
  } else if (len > 50) {
    issues.push({ type: 'warning', text: 'A bit long (' + len + ' chars). Shorter subjects get higher open rates.' });
    score -= 5;
  } else {
    issues.push({ type: 'success', text: 'Character length: ' + len + ' characters (ideal mobile cutoff is 50 chars).' });
  }

  const capsRatio = (trimmed.match(/[A-Z]/g) || []).length / Math.max(len, 1);
  if (capsRatio > 0.7 && len > 5) {
    issues.push({ type: 'error', text: 'Capitalization: ALL CAPS detected — excessive capitalization triggers spam filters.' });
    suggestions.push('Use normal capitalization');
    score -= 25;
  } else if (len > 0) {
    issues.push({ type: 'success', text: 'Capitalization: Natural sentence case with zero all-caps triggers.' });
  }

  const exclCount = (trimmed.match(/!/g) || []).length;
  if (exclCount >= 3) {
    issues.push({ type: 'error', text: exclCount + ' exclamation marks — looks spammy' });
    score -= 20;
  } else if (exclCount >= 1) {
    issues.push({ type: 'warning', text: 'Exclamation mark in subject — use sparingly' });
    score -= 5;
  }

  const lowerSubject = trimmed.toLowerCase();
  const foundSpam = [];
  SPAM_WORDS.critical.concat(SPAM_WORDS.high).forEach(function (word) {
    if (lowerSubject.indexOf(word.toLowerCase()) !== -1) foundSpam.push(word);
  });
  if (foundSpam.length > 0) {
    issues.push({ type: 'warning', text: 'Flagged keywords: ' + foundSpam.join(', ') + ' triggers automated promotional filtering.' });
    suggestions.push('Remove or rephrase spam trigger words');
    score -= foundSpam.length * 15;
  }

  if (trimmed.indexOf('?') !== -1) score += 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues,
    suggestions: suggestions,
    charCount: len,
    wordCount: trimmed.split(/\s+/).filter(Boolean).length,
  };
}

function analyzeBody(body) {
  const issues = [];
  const suggestions = [];
  let score = 100;
  const trimmed = body.trim();
  const lowerBody = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(function (w) { return w.length > 0; });
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      score: 0,
      issues: [{ type: 'error', text: 'No body content to analyze — empty input scores 0' }],
      suggestions: suggestions,
      spamWords: [],
      wordCount: 0,
      linkCount: 0,
    };
  }

  const foundCritical = [], foundHigh = [], foundMedium = [];
  SPAM_WORDS.critical.forEach(function (w) { if (lowerBody.indexOf(w.toLowerCase()) !== -1) foundCritical.push(w); });
  SPAM_WORDS.high.forEach(function (w) { if (lowerBody.indexOf(w.toLowerCase()) !== -1) foundHigh.push(w); });
  SPAM_WORDS.medium.forEach(function (w) { if (lowerBody.indexOf(w.toLowerCase()) !== -1) foundMedium.push(w); });

  if (foundCritical.length > 0) {
    issues.push({ type: 'error', text: 'Critical spam phrases: ' + foundCritical.join(', ') });
    score -= foundCritical.length * 20;
  }
  if (foundHigh.length > 0) {
    issues.push({ type: 'error', text: 'High-risk spam words: ' + foundHigh.join(', ') });
    score -= foundHigh.length * 10;
  }
  if (foundMedium.length > 0) {
    issues.push({ type: 'warning', text: 'Medium-risk words: ' + foundMedium.join(', ') });
    score -= foundMedium.length * 5;
  }
  if (foundCritical.length + foundHigh.length + foundMedium.length > 0) {
    suggestions.push('Replace spam trigger words with neutral alternatives');
  } else {
    issues.push({ type: 'success', text: 'Clean copy: no spam trigger words detected in body.' });
  }

  const linkCount = (trimmed.match(/https?:\/\//g) || []).length;
  if (linkCount > 5) {
    issues.push({ type: 'warning', text: linkCount + ' links — too many links can trigger spam filters' });
    suggestions.push('Reduce to 3 or fewer links');
    score -= 10;
  } else if (linkCount > 0) {
    issues.push({ type: 'success', text: 'Link density: ' + linkCount + ' link' + (linkCount !== 1 ? 's' : '') + ' — within safe limits.' });
  }

  const capsSections = trimmed.match(/[A-Z\s]{20,}/g) || [];
  if (capsSections.length > 0) {
    issues.push({ type: 'warning', text: 'ALL CAPS sections detected in body' });
    score -= 10;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues: issues,
    suggestions: suggestions,
    spamWords: foundCritical.concat(foundHigh, foundMedium),
    wordCount: wordCount,
    linkCount: linkCount,
  };
}

function getTier(score) {
  if (score <= 0) return { label: 'No Content', grade: 'F', color: '#ef4444', desc: 'Empty input — add a subject and body to get a real deliverability score.' };
  if (score >= 80) return { label: 'Inbox Tier', grade: 'A', color: '#10b981', desc: 'High primary inbox placement probability across Google Workspace & Outlook 365.' };
  if (score >= 70) return { label: 'Promo Tier', grade: 'B', color: '#ffb95f', desc: 'Likely to land in Promotions tab. Minor tweaks needed.' };
  return { label: 'Spam Tier', grade: 'C', color: '#ef4444', desc: 'High spam risk. Major revisions required before sending.' };
}

function analyzeEmail(subject, body) {
  // Empty input (no subject AND no body) must score 0 / F-tier — never a passing grade.
  const isEmptyInput = !subject.trim() && !body.trim();
  const s = analyzeSubject(subject);
  const b = analyzeBody(body);
  const overall = isEmptyInput ? 0 : Math.round(s.score * 0.4 + b.score * 0.6);
  const tier = getTier(overall);
  return { subject: s, body: b, overall: overall, tier: tier };
}

/* ── UI wiring (DOM only; skipped when loaded in Node for tests) ── */
var SVG_ICONS = {
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
};

var GAUGE_CIRCUMFERENCE = 2 * Math.PI * 54; // 339.292

function renderIssues(container, issues) {
  while (container.firstChild) container.removeChild(container.firstChild);
  issues.forEach(function (issue) {
    var row = document.createElement('div');
    row.className = 'issue-row issue-' + issue.type;
    var iconWrap = document.createElement('span');
    iconWrap.innerHTML = SVG_ICONS[issue.type] || SVG_ICONS.success;
    var text = document.createElement('span');
    text.textContent = issue.text;
    row.appendChild(iconWrap);
    row.appendChild(text);
    container.appendChild(row);
  });
}

function renderChips(container, words) {
  while (container.firstChild) container.removeChild(container.firstChild);
  words.forEach(function (word) {
    var chip = document.createElement('span');
    chip.className = 'chip';
    var quoted = document.createElement('span');
    quoted.textContent = '"' + word + '"';
    var note = document.createElement('small');
    note.textContent = ' (spam trigger)';
    chip.appendChild(quoted);
    chip.appendChild(note);
    container.appendChild(chip);
  });
}

function renderResults(result) {
  var tier = result.tier;

  // Score ring
  var arc = document.getElementById('gaugeArc');
  var offset = GAUGE_CIRCUMFERENCE - (result.overall / 100) * GAUGE_CIRCUMFERENCE;
  arc.setAttribute('stroke', tier.color);
  arc.setAttribute('stroke-dasharray', String(GAUGE_CIRCUMFERENCE));
  arc.setAttribute('stroke-dashoffset', String(offset));
  arc.style.transition = 'stroke-dashoffset 0.8s ease, stroke 0.5s ease';
  document.getElementById('gaugeScore').textContent = String(result.overall);

  // Grade badge + tier description
  var badge = document.getElementById('gradeBadge');
  badge.textContent = tier.grade + ' — ' + tier.label;
  badge.style.background = tier.color + '1f';
  badge.style.color = tier.color;
  badge.style.border = '1px solid ' + tier.color + '33';
  document.getElementById('tierDesc').textContent = tier.desc;

  // Diagnostics
  document.getElementById('subjectScore').textContent = result.subject.score + '/100';
  document.getElementById('bodyScore').textContent = result.body.score + '/100';
  renderIssues(document.getElementById('subjectIssues'), result.subject.issues);
  renderIssues(document.getElementById('bodyIssues'), result.body.issues);

  // Trigger-word chips
  var chipsBox = document.getElementById('chipsBox');
  if (result.body.spamWords.length > 0) {
    chipsBox.classList.remove('hidden');
    var n = result.body.spamWords.length;
    document.getElementById('chipsTitle').textContent =
      'Real-time keyword detection — ' + n + ' flag' + (n !== 1 ? 's' : '') + ' identified';
    renderChips(document.getElementById('triggerChips'), result.body.spamWords);
  } else {
    chipsBox.classList.add('hidden');
  }

  // Top 3 suggestions (deduped)
  var suggestBox = document.getElementById('suggestBox');
  var allSuggestions = [];
  result.subject.suggestions.concat(result.body.suggestions).forEach(function (s) {
    if (allSuggestions.indexOf(s) === -1) allSuggestions.push(s);
  });
  var top = allSuggestions.slice(0, 3);
  var list = document.getElementById('suggestionsList');
  while (list.firstChild) list.removeChild(list.firstChild);
  if (top.length > 0) {
    suggestBox.classList.remove('hidden');
    top.forEach(function (s, i) {
      var li = document.createElement('li');
      var num = document.createElement('b');
      num.textContent = (i + 1) + '.';
      var txt = document.createElement('span');
      txt.textContent = s;
      li.appendChild(num);
      li.appendChild(txt);
      list.appendChild(li);
    });
  } else {
    suggestBox.classList.add('hidden');
  }

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('emptyState').classList.add('hidden');
}

function updateCounters() {
  var subject = document.getElementById('subjectInput').value;
  var body = document.getElementById('bodyInput').value;
  var trimmed = subject.trim();
  var len = trimmed.length;
  var counter = document.getElementById('subjectCounter');
  counter.textContent = len + ' chars';
  counter.classList.toggle('counter-optimal', len > 0 && len <= 50);

  var b = analyzeBody(body);
  var bodyCounter = document.getElementById('bodyCounter');
  bodyCounter.textContent = '';
  var w = document.createElement('span');
  w.textContent = b.wordCount + ' words · ' + b.linkCount + ' link' + (b.linkCount !== 1 ? 's' : '');
  bodyCounter.appendChild(w);
}

function initPopup() {
  document.getElementById('subjectInput').addEventListener('input', updateCounters);
  document.getElementById('bodyInput').addEventListener('input', updateCounters);

  document.getElementById('analyzeBtn').addEventListener('click', function () {
    var subject = document.getElementById('subjectInput').value;
    var body = document.getElementById('bodyInput').value;
    renderResults(analyzeEmail(subject, body));
  });

  document.getElementById('clearBtn').addEventListener('click', function () {
    document.getElementById('subjectInput').value = '';
    document.getElementById('bodyInput').value = '';
    document.getElementById('results').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    updateCounters();
  });

  updateCounters();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initPopup);
}

/* Exported for Node test harness (guarded — no module system in the popup). */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SPAM_WORDS: SPAM_WORDS,
    analyzeSubject: analyzeSubject,
    analyzeBody: analyzeBody,
    getTier: getTier,
    analyzeEmail: analyzeEmail,
  };
}
if (typeof window !== 'undefined') {
  window.NovaSpam = {
    analyzeEmail: analyzeEmail,
    getTier: getTier,
  };
}
