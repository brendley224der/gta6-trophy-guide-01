// Leonida Platinum — GTA VI trophy guide and tracker.
// Plain ES module, no libraries, no network beyond fetching data/trophies.json
// from this same app/ directory. Progress lives in localStorage only.

const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'leonida-platinum-v2';
const DEMO_EARNED = [2, 3, 4, 5, 8, 9, 10, 16, 21, 28, 44, 46, 53];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_LABEL = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_LABEL = {
  story: 'Story', activities: 'Activities', collectibles: 'Collectibles',
  combat: 'Combat', exploration: 'Exploration', money: 'Money',
  misc: 'Misc', platinum: 'Platinum',
};

const params = new URLSearchParams(location.search);
const demoMode = params.get('demo') === '1';

// ---- state ---------------------------------------------------------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { earned: [], notes: {}, spoiler: false };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter(Number.isInteger) : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return { earned: [], notes: {}, spoiler: false };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: the checklist still works for the session.
  }
}

const state = loadState();
if (demoMode && state.earned.length === 0) {
  state.earned = [...DEMO_EARNED];
}
if (params.get('spoiler') === '1') state.spoiler = true;
const earnedSet = new Set(state.earned);

function toggleEarned(id) {
  if (earnedSet.has(id)) earnedSet.delete(id);
  else earnedSet.add(id);
  state.earned = [...earnedSet].sort((a, b) => a - b);
  saveState();
  renderProgress();
  renderNextUp();
}

// ---- helpers -------------------------------------------------------------

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function difficultyDots(level) {
  const filled = '●'.repeat(Math.max(0, Math.min(5, level)));
  const empty = '○'.repeat(5 - Math.max(0, Math.min(5, level)));
  return `<span class="dots" title="Difficulty ${level} of 5">${filled}${empty}</span>`;
}

function trophyById(id) {
  return DATA.trophies.find((t) => t.id === id);
}

function isSpoilerHidden(trophy) {
  return state.spoiler && trophy.kind === 'story' && !earnedSet.has(trophy.id);
}

function displayName(trophy) {
  return isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isSpoilerHidden(trophy)
    ? 'A story trophy — earn it (or turn spoilers off) to reveal it.'
    : trophy.description;
}

// ---- data ----------------------------------------------------------------

let DATA = { trophies: [], roadmap: [] };
let selectedId = null;

const $ = (id) => document.getElementById(id);
const listEl = $('trophyList');
const detailBody = $('detailBody');
const statusEl = $('status');

function setStatus(message) {
  statusEl.textContent = message || '';
}

// ---- filters --------------------------------------------------------------

function currentFilters() {
  return {
    query: $('search').value.trim().toLowerCase(),
    grade: $('gradeFilter').value,
    kind: $('kindFilter').value,
    stage: $('stageFilter').value,
    sort: $('sortFilter').value,
    missableOnly: $('missableOnly').checked,
    unearnedOnly: $('unearnedOnly').checked,
  };
}

function filteredTrophies() {
  const f = currentFilters();
  let out = DATA.trophies.filter((t) => {
    if (f.grade && t.grade !== f.grade) return false;
    if (f.kind && t.kind !== f.kind) return false;
    if (f.stage && String(t.stage) !== f.stage) return false;
    if (f.missableOnly && !t.missable) return false;
    if (f.unearnedOnly && earnedSet.has(t.id)) return false;
    if (f.query) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
      if (!hay.includes(f.query)) return false;
    }
    return true;
  });
  const byRoadmap = (a, b) => a.stage - b.stage || a.id - b.id;
  if (f.sort === 'grade') out.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (f.sort === 'difficulty') out.sort((a, b) => a.difficulty - b.difficulty || a.id - b.id);
  else if (f.sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  else out.sort(byRoadmap);
  return out;
}

// ---- list rendering ---------------------------------------------------------

function trophyItemHtml(trophy) {
  const earned = earnedSet.has(trophy.id);
  const hidden = isSpoilerHidden(trophy);
  const gradeClass = `grade-${trophy.grade}`;
  return `<li class="trophy ${earned ? 'earned' : ''} ${trophy.missable ? 'missable' : ''}" data-id="${trophy.id}">
    <label class="trophy-check">
      <input type="checkbox" data-earned="${trophy.id}" ${earned ? 'checked' : ''}>
      <span class="visually-hidden">Earned: ${escapeHtml(displayName(trophy))}</span>
    </label>
    <button type="button" class="trophy-main" data-open="${trophy.id}">
      <span class="trophy-top">
        <span class="badge ${gradeClass}">${GRADE_LABEL[trophy.grade]}</span>
        <span class="trophy-name">${escapeHtml(displayName(trophy))}</span>
        ${trophy.missable ? '<span class="flag">Possibly missable</span>' : ''}
      </span>
      <span class="trophy-desc">${escapeHtml(displayDescription(trophy))}</span>
      <span class="trophy-meta">
        <span>Stage ${trophy.stage}</span>
        <span>${escapeHtml(KIND_LABEL[trophy.kind] || trophy.kind)}</span>
        ${difficultyDots(trophy.difficulty)}
        <span>${escapeHtml(trophy.time)}</span>
        ${hidden ? '' : `<span class="trophy-count">${trophy.steps ? trophy.steps.length + ' steps' : ''}</span>`}
      </span>
    </button>
  </li>`;
}

function renderList() {
  const items = filteredTrophies();
  if (items.length === 0) {
    listEl.innerHTML = '<li class="empty">No trophies match these filters. Clear the search or a filter to see the full list.</li>';
    return;
  }
  listEl.innerHTML = items.map(trophyItemHtml).join('');
}

// ---- progress ---------------------------------------------------------------

function renderProgress() {
  const total = DATA.trophies.length;
  const done = earnedSet.size;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  $('progressBar').style.width = `${pct}%`;
  $('progressText').textContent = total === 0
    ? 'Loading the trophy list…'
    : `${done} of ${total} trophies earned — ${pct}% — ${total - done} to go`;
  const missableLeft = DATA.trophies.filter((t) => t.missable && !earnedSet.has(t.id)).length;
  $('missableCount').textContent = missableLeft === 0 ? '' : `(${missableLeft} left)`;
  document.querySelectorAll('input[data-earned]').forEach((box) => {
    const id = Number(box.dataset.earned);
    box.checked = earnedSet.has(id);
    box.closest('li.trophy').classList.toggle('earned', earnedSet.has(id));
  });
}

function progressBy(groupKey, groupLabel) {
  const groups = {};
  for (const t of DATA.trophies) {
    const key = String(t[groupKey]);
    groups[key] = groups[key] || { label: groupLabel(key), done: 0, total: 0 };
    groups[key].total += 1;
    if (earnedSet.has(t.id)) groups[key].done += 1;
  }
  return Object.values(groups).map((g) => {
    const pct = g.total === 0 ? 0 : Math.round((g.done / g.total) * 100);
    return `<div class="mini-progress">
      <span class="mini-label">${escapeHtml(g.label)}</span>
      <span class="mini-track"><span class="mini-fill" style="width:${pct}%"></span></span>
      <span class="mini-count">${g.done}/${g.total}</span>
    </div>`;
  }).join('');
}

// ---- next up ------------------------------------------------------------------

function nextUpTrophy() {
  const remaining = DATA.trophies.filter((t) => !earnedSet.has(t.id));
  if (remaining.length === 0) return null;
  const missable = remaining.filter((t) => t.missable).sort((a, b) => a.stage - b.stage || a.id - b.id);
  if (missable.length > 0) return { trophy: missable[0], reason: 'possibly missable — do it before its window closes' };
  const sorted = [...remaining].sort((a, b) => a.stage - b.stage || a.difficulty - b.difficulty || a.id - b.id);
  return { trophy: sorted[0], reason: `roadmap stage ${sorted[0].stage}, difficulty ${sorted[0].difficulty}/5` };
}

function renderNextUp() {
  const next = nextUpTrophy();
  const el = $('nextUp');
  if (!next) {
    el.hidden = false;
    el.innerHTML = '<strong>Platinum earned.</strong> Every trophy is ticked — enjoy Leonida, legend.';
    return;
  }
  el.hidden = false;
  el.innerHTML = `<strong>Next up:</strong> <button type="button" class="linklike" data-open="${next.trophy.id}">${escapeHtml(next.trophy.name)}</button> — ${escapeHtml(next.reason)}.`;
}

// ---- detail pane ------------------------------------------------------------

function guideAsText(trophy) {
  const lines = [
    `${trophy.name} (${GRADE_LABEL[trophy.grade]}) — ${trophy.description}`,
    '',
    trophy.guide,
    '',
    'Steps:',
    ...trophy.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    'Tips:',
    ...trophy.tips.map((s) => `- ${s}`),
    '',
    'Pitfalls:',
    ...trophy.pitfalls.map((s) => `- ${s}`),
    '',
    `Difficulty ${trophy.difficulty}/5 — ${trophy.time} — Roadmap stage ${trophy.stage}.`,
    `Sources: ${trophy.sources.join('; ')}.`,
  ];
  return lines.join('\n');
}

function renderDetail() {
  const trophy = selectedId === null ? null : trophyById(selectedId);
  if (!trophy) {
    detailBody.innerHTML = `<h2>Pick a trophy</h2>
      <p>Select any trophy in the list to read its full guide — concrete steps, tips, pitfalls, difficulty and time — with its sources.</p>
      <p>Tick trophies off as you earn them; your progress saves in this browser automatically.</p>
      <h3>Progress by grade</h3>
      ${progressBy('grade', (k) => GRADE_LABEL[k])}
      <h3>Progress by roadmap stage</h3>
      ${progressBy('stage', (k) => `Stage ${k}`)}`;
    return;
  }
  const earned = earnedSet.has(trophy.id);
  const hidden = isSpoilerHidden(trophy);
  const note = state.notes[trophy.id] || '';
  detailBody.innerHTML = `
    <h2>${escapeHtml(displayName(trophy))}</h2>
    <p class="detail-badges">
      <span class="badge grade-${trophy.grade}">${GRADE_LABEL[trophy.grade]}</span>
      <span>${escapeHtml(KIND_LABEL[trophy.kind] || trophy.kind)}</span>
      <span>Stage ${trophy.stage}</span>
      ${difficultyDots(trophy.difficulty)}
      <span>${escapeHtml(trophy.time)}</span>
    </p>
    <p class="detail-desc">${escapeHtml(displayDescription(trophy))}</p>
    ${trophy.missable ? '<p class="warning"><strong>Possibly missable (unverified).</strong> Make a manual save before the moment this trophy depends on — a partner mission or a story choice — and reload it if the trophy does not pop.</p>' : ''}
    ${hidden ? '<p>Turn spoilers off (or earn this trophy) to read its guide.</p>' : `
    <p class="guide-text">${escapeHtml(trophy.guide)}</p>
    <h3>Steps</h3>
    <ol class="steps">${trophy.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    <h3>Tips</h3>
    <ul class="tips">${trophy.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    <h3>Pitfalls</h3>
    <ul class="pitfalls">${trophy.pitfalls.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    <h3>Sources</h3>
    <ul class="sources">${trophy.sources.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`}
    <div class="detail-actions">
      <button type="button" id="detailToggle">${earned ? 'Mark as not earned' : 'Mark as earned'}</button>
      ${hidden ? '' : '<button type="button" id="copyGuide">Copy guide as text</button>'}
    </div>
    <label class="note-label">Your note on this trophy
      <textarea id="trophyNote" rows="3" placeholder="e.g. failed the first attempt — retry after the story">${escapeHtml(note)}</textarea>
    </label>
    <h3>Progress by grade</h3>
    ${progressBy('grade', (k) => GRADE_LABEL[k])}
    <h3>Progress by roadmap stage</h3>
    ${progressBy('stage', (k) => `Stage ${k}`)}`;

  $('detailToggle').addEventListener('click', () => {
    toggleEarned(trophy.id);
    renderDetail();
  });
  const copyBtn = $('copyGuide');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(guideAsText(trophy));
        setStatus('Guide copied to the clipboard.');
      } catch {
        setStatus('Copy failed — select the guide text manually.');
      }
    });
  }
  $('trophyNote').addEventListener('input', (event) => {
    const value = event.target.value.trim();
    if (value) state.notes[trophy.id] = value;
    else delete state.notes[trophy.id];
    saveState();
  });
}

function selectTrophy(id, { scroll = true } = {}) {
  selectedId = id;
  const url = new URL(location.href);
  url.searchParams.set('t', String(id));
  history.replaceState(null, '', url);
  renderDetail();
  if (scroll) $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---- roadmap + missables -------------------------------------------------------

function renderRoadmap() {
  $('roadmapBody').innerHTML = DATA.roadmap.map((stage) => {
    const stageTrophies = DATA.trophies.filter((t) => t.stage === stage.stage);
    const done = stageTrophies.filter((t) => earnedSet.has(t.id)).length;
    const pct = stageTrophies.length === 0 ? 0 : Math.round((done / stageTrophies.length) * 100);
    const items = stageTrophies.map((t) => `<li class="${earnedSet.has(t.id) ? 'earned' : ''}">
      <button type="button" class="linklike" data-open="${t.id}">${escapeHtml(displayName(t))}</button>
      <span class="roadmap-tag">${GRADE_LABEL[t.grade]}${t.missable ? ' · possibly missable' : ''}</span>
    </li>`).join('');
    return `<article class="stage">
      <h3>Stage ${stage.stage} — ${escapeHtml(stage.title)}</h3>
      <p>${escapeHtml(stage.summary)}</p>
      <p class="stage-progress">${done}/${stageTrophies.length} earned — ${pct}%</p>
      <div class="progress-track slim"><div class="progress-fill" style="width:${pct}%"></div></div>
      <ul class="stage-list">${items}</ul>
    </article>`;
  }).join('');
}

function renderMissables() {
  const items = DATA.trophies.filter((t) => t.missable);
  $('missableList').innerHTML = items.map(trophyItemHtml).join('');
}

// ---- views -------------------------------------------------------------------

function showView(name) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === name);
  });
  document.querySelectorAll('.view').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${name}`);
  });
  const url = new URL(location.href);
  url.searchParams.set('view', name);
  history.replaceState(null, '', url);
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
}

// ---- export / import / reset ----------------------------------------------------

function exportProgress() {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earnedSet].sort((a, b) => a - b),
    notes: state.notes,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-platinum-progress.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus('Progress exported — keep the file somewhere safe.');
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = (parsed.earned || []).filter((id) => Number.isInteger(id) && trophyById(id));
      earnedSet.clear();
      ids.forEach((id) => earnedSet.add(id));
      state.earned = [...earnedSet].sort((a, b) => a - b);
      if (parsed.notes && typeof parsed.notes === 'object') state.notes = parsed.notes;
      saveState();
      renderList();
      renderDetail();
      renderProgress();
      renderNextUp();
      setStatus(`Imported ${ids.length} earned trophies.`);
    } catch {
      setStatus('That file is not a progress export from this guide.');
    }
  };
  reader.readAsText(file);
}

// ---- events ---------------------------------------------------------------------

function wireEvents() {
  ['search', 'gradeFilter', 'kindFilter', 'stageFilter', 'sortFilter'].forEach((id) => {
    $(id).addEventListener('input', renderList);
  });
  $('missableOnly').addEventListener('change', renderList);
  $('unearnedOnly').addEventListener('change', renderList);
  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    saveState();
    renderList();
    renderDetail();
    renderNextUp();
  });
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  });
  listEl.addEventListener('change', (event) => {
    const box = event.target.closest('input[data-earned]');
    if (box) toggleEarned(Number(box.dataset.earned));
  });
  listEl.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) selectTrophy(Number(opener.dataset.open));
  });
  $('missableList').addEventListener('change', (event) => {
    const box = event.target.closest('input[data-earned]');
    if (box) {
      toggleEarned(Number(box.dataset.earned));
      renderMissables();
    }
  });
  $('missableList').addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      showView('checklist');
      selectTrophy(Number(opener.dataset.open));
    }
  });
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('#nextUp [data-open], #roadmapBody [data-open]');
    if (opener) {
      showView('checklist');
      selectTrophy(Number(opener.dataset.open));
    }
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) importProgress(file);
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear every ticked trophy and every note? Export first if you want a copy.')) return;
    earnedSet.clear();
    state.earned = [];
    state.notes = {};
    saveState();
    renderList();
    renderDetail();
    renderProgress();
    renderNextUp();
    setStatus('Checklist reset.');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== $('search')) {
      event.preventDefault();
      $('search').focus();
    }
  });
}

// ---- init -------------------------------------------------------------------------

async function init() {
  wireEvents();
  $('spoilerToggle').checked = state.spoiler;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA = await response.json();
    if (!Array.isArray(DATA.trophies) || DATA.trophies.length === 0) throw new Error('empty trophy list');
    DATA.trophies.sort((a, b) => a.id - b.id);
  } catch (error) {
    setStatus('Could not load data/trophies.json — serve app/ over HTTP instead of opening the file directly.');
    $('progressText').textContent = 'Trophy list failed to load.';
    return;
  }
  renderList();
  renderDetail();
  renderProgress();
  renderNextUp();
  const wantedView = params.get('view');
  if (wantedView === 'roadmap' || wantedView === 'missables') showView(wantedView);
  const wantedTrophy = Number(params.get('t'));
  if (Number.isInteger(wantedTrophy) && trophyById(wantedTrophy)) {
    selectTrophy(wantedTrophy, { scroll: false });
  }
}

init();
