// Leonida Platinum — GTA VI trophy guide & tracker. Static, offline, no libraries.
// Earned trophies and personal notes persist in localStorage; export/import
// round-trips them as JSON. The guide data lives in data/trophies.json: the 55
// official trophies with a guide, steps, tips and pitfalls for each one.
//
// Features: search, filters by grade / kind / roadmap stage / missable, sort by
// roadmap order, grade, difficulty or name, a per-stage progress bar, a
// per-grade earned breakdown, a "next up" suggestion, per-trophy notes, a
// spoiler setting that hides story trophies until earned, and a copy-guide
// button on every trophy's detail pane.
const STORE_KEY = 'gta6-trophy-checklist-v2';
const SPOILER_STORE_KEY = 'gta6-trophy-spoilers-v2';
const NOTES_STORE_KEY = 'gta6-trophy-notes-v2';
const SORT_STORE_KEY = 'gta6-trophy-sort-v2';

// Difficulty is a 1-5 rating on each trophy in the data: 1 is a quiet errand,
// 5 is a long skill grind. It is our own judgement from the official
// description, not a PlayStation figure.
const DIFFICULTY_LABEL = {
  1: 'Easy',
  2: 'Straightforward',
  3: 'Needs some effort',
  4: 'A real grind',
  5: 'The hardest grind',
};

const ROADMAP = {
  1: ['Story playthrough', 'Play Chapters 1-4 and the story missions in order. Nothing here is missable — just enjoy the story and learn the map.'],
  2: ['Finale & partners', 'Finish the final mission and the partner-linked trophies. Keep a manual save before partner missions and big story choices.'],
  3: ['Side content', 'Stranger strands, activities, collectibles and exploration — meditation spots, cards, WAiNK locations, vehicles and regions.'],
  4: ['Grind & cleanup', 'The counted grinds: 250 stunts, 20 races, 50 challenges, 42 gold Shooting Range medals, 5 bank vaults, $250k laundered.'],
  5: ['Platinum', 'Attain 100% completion and the platinum pops with the last trophy. Check the in-game Stats tracker before the final push.'],
};
// 13 of 55 earned, demo seed only (?demo=1) so screenshots show progress.
const DEMO_EARNED_IDS = [2, 3, 4, 5, 8, 9, 10, 15, 16, 21, 44, 46, 53];

const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };

const query = new URLSearchParams(location.search);
const data = await (await fetch('data/trophies.json')).json();
const allTrophies = data.trophies;

let earnedNames = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
let notes = JSON.parse(localStorage.getItem(NOTES_STORE_KEY) ?? '{}');
if (query.get('demo') === '1' && !localStorage.getItem(STORE_KEY)) {
  earnedNames = new Set(DEMO_EARNED_IDS.map((id) => allTrophies.find((t) => t.id === id).name));
  persistEarned();
}

const searchBox = document.getElementById('q');
const gradeBox = document.getElementById('grade');
const kindBox = document.getElementById('kind');
const stageBox = document.getElementById('stage');
const sortBox = document.getElementById('sort');
const missableBox = document.getElementById('missableOnly');
const spoilerBox = document.getElementById('spoiler');
const rowsRoot = document.getElementById('rows');
const detailRoot = document.getElementById('detail');
let openTrophyId = null;

spoilerBox.checked = localStorage.getItem(SPOILER_STORE_KEY) === '1' || query.get('spoiler') === '1';
sortBox.value = localStorage.getItem(SORT_STORE_KEY) ?? 'roadmap';

function persistEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earnedNames]));
}

function persistNotes() {
  localStorage.setItem(NOTES_STORE_KEY, JSON.stringify(notes));
}

function gradeWord(trophy) {
  return trophy.grade[0].toUpperCase() + trophy.grade.slice(1);
}

function difficultyText(trophy) {
  const level = trophy.difficulty ?? 2;
  return '★'.repeat(level) + '☆'.repeat(5 - level) + ' ' + (DIFFICULTY_LABEL[level] ?? '');
}

function spoilersHide(trophy) {
  return spoilerBox.checked && trophy.kind === 'story' && !earnedNames.has(trophy.name);
}

function sortTrophies(list) {
  const sorted = [...list];
  const mode = sortBox.value;
  if (mode === 'grade') {
    sorted.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.stage - b.stage || a.id - b.id);
  } else if (mode === 'difficulty') {
    sorted.sort((a, b) => (b.difficulty ?? 2) - (a.difficulty ?? 2) || a.stage - b.stage || a.id - b.id);
  } else if (mode === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (mode === 'easiest') {
    sorted.sort((a, b) => (a.difficulty ?? 2) - (b.difficulty ?? 2) || a.stage - b.stage || a.id - b.id);
  } else {
    sorted.sort((a, b) => a.stage - b.stage || a.id - b.id);
  }
  return sorted;
}

function matchingTrophies() {
  const needle = searchBox.value.trim().toLowerCase();
  const filtered = allTrophies.filter((trophy) => {
    if (gradeBox.value !== 'all' && trophy.grade !== gradeBox.value) return false;
    if (kindBox.value !== 'all' && trophy.kind !== kindBox.value) return false;
    if (stageBox.value !== 'all' && String(trophy.stage) !== stageBox.value) return false;
    if (missableBox.checked && !trophy.missable) return false;
    if (needle) {
      const haystack = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide + ' ' + (trophy.tips ?? []).join(' ') + ' ' + (trophy.steps ?? []).join(' ')).toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
  return sortTrophies(filtered);
}

// The next trophy worth doing: the earliest roadmap stage still open, with
// missable trophies first — they are the only ones that can be lost.
function nextUpTrophy() {
  const open = allTrophies.filter((t) => !earnedNames.has(t.name));
  if (open.length === 0) return null;
  open.sort((a, b) => (b.missable - a.missable) || a.stage - b.stage || (a.difficulty ?? 2) - (b.difficulty ?? 2));
  return open[0];
}

function tagChip(text, extraClass) {
  const chip = document.createElement('span');
  chip.className = 'chip' + (extraClass ? ' ' + extraClass : '');
  chip.textContent = text;
  return chip;
}

function paintProgress() {
  const earned = earnedNames.size;
  const pct = Math.round((earned / allTrophies.length) * 100);
  document.getElementById('earnedCount').textContent = earned;
  document.getElementById('barFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = pct + '% of the way to the platinum';
  document.getElementById('missCount').textContent =
    '(' + allTrophies.filter((t) => t.missable).length + ')';
  paintGradeBreakdown();
  paintStageBars();
  paintNextUp();
}

function paintGradeBreakdown() {
  const root = document.getElementById('gradeBreakdown');
  if (!root) return;
  root.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const total = allTrophies.filter((t) => t.grade === grade).length;
    const earned = allTrophies.filter((t) => t.grade === grade && earnedNames.has(t.name)).length;
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = grade[0].toUpperCase() + grade.slice(1);
    const bar = document.createElement('span');
    bar.className = 'mini-track';
    const fill = document.createElement('span');
    fill.className = 'mini-fill grade-' + grade;
    fill.style.width = (total ? Math.round((earned / total) * 100) : 0) + '%';
    bar.append(fill);
    const count = document.createElement('span');
    count.className = 'mini-count';
    count.textContent = earned + ' / ' + total;
    row.append(label, bar, count);
    root.append(row);
  }
}

function paintStageBars() {
  const root = document.getElementById('stageBars');
  if (!root) return;
  root.replaceChildren();
  for (const [stage, [title]] of Object.entries(ROADMAP)) {
    const inStage = allTrophies.filter((t) => t.stage === Number(stage));
    const earned = inStage.filter((t) => earnedNames.has(t.name)).length;
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = 'Stage ' + stage + ' · ' + title;
    const bar = document.createElement('span');
    bar.className = 'mini-track';
    const fill = document.createElement('span');
    fill.className = 'mini-fill';
    fill.style.width = (inStage.length ? Math.round((earned / inStage.length) * 100) : 0) + '%';
    bar.append(fill);
    const count = document.createElement('span');
    count.className = 'mini-count';
    count.textContent = earned + ' / ' + inStage.length;
    row.append(label, bar, count);
    root.append(row);
  }
}

function paintNextUp() {
  const root = document.getElementById('nextUp');
  if (!root) return;
  root.replaceChildren();
  const next = nextUpTrophy();
  if (!next) {
    const done = document.createElement('p');
    done.className = 'next-up-done';
    done.textContent = 'All 55 trophies earned — the platinum is yours. Congratulations, Leonida Legend!';
    root.append(done);
    return;
  }
  const label = document.createElement('p');
  label.className = 'next-up-label';
  label.textContent = next.missable ? 'Next up — missable, do it soon' : 'Next up';
  const name = document.createElement('p');
  name.className = 'next-up-name';
  name.textContent = next.name + ' (' + gradeWord(next) + ', stage ' + next.stage + ')';
  const why = document.createElement('p');
  why.className = 'next-up-why';
  why.textContent = next.missable
    ? 'Flagged missable: it is tied to a moment that may not come back. Open the guide and save first.'
    : next.description;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'read-guide-btn';
  button.textContent = 'Read its guide';
  button.addEventListener('click', () => openGuide(next));
  root.append(label, name, why, button);
}

function paintList() {
  const visible = matchingTrophies();
  document.getElementById('countLine').textContent =
    'Showing ' + visible.length + ' of ' + allTrophies.length + ' trophies · ' + earnedNames.size + ' earned';
  paintProgress();
  rowsRoot.replaceChildren();
  for (const trophy of visible) {
    const hidden = spoilersHide(trophy);
    const item = document.createElement('li');
    item.className = 'trophy-row grade-' + trophy.grade + (earnedNames.has(trophy.name) ? ' is-earned' : '');

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = earnedNames.has(trophy.name);
    toggle.setAttribute('aria-label', 'Earned: ' + trophy.name);
    toggle.addEventListener('change', () => {
      if (toggle.checked) earnedNames.add(trophy.name);
      else earnedNames.delete(trophy.name);
      persistEarned();
      paintList();
      if (openTrophyId === trophy.id) openGuide(trophy);
    });

    const body = document.createElement('div');
    const title = document.createElement('h3');
    if (hidden) {
      title.textContent = 'Hidden story trophy — earn it to reveal';
    } else {
      const pip = document.createElement('span');
      pip.className = 'pip pip-' + trophy.grade;
      title.append(pip, document.createTextNode(trophy.name));
    }
    const blurb = document.createElement('p');
    blurb.className = 'trophy-desc';
    blurb.textContent = hidden
      ? 'Spoilers hidden. Tick it earned to reveal the name and guide.'
      : trophy.description;
    const chips = document.createElement('p');
    chips.className = 'chip-row';
    chips.append(
      tagChip(gradeWord(trophy) + ' · ' + trophy.kind),
      tagChip('Stage ' + trophy.stage),
      tagChip(trophy.time),
      tagChip(difficultyText(trophy)),
      tagChip(earnedNames.has(trophy.name) ? 'Earned ✓' : 'Not earned'),
    );
    if (trophy.missable) chips.append(tagChip('⚠ Missable — save first', 'chip-warn'));
    if (notes[trophy.name]) chips.append(tagChip('📝 Note saved', 'chip-note'));
    body.append(title, blurb, chips);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'read-guide-btn';
    openBtn.textContent = hidden ? 'Why hidden?' : 'Read guide';
    openBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openGuide(trophy);
    });
    item.append(toggle, body, openBtn);
    item.addEventListener('click', (event) => {
      if (event.target !== toggle) openGuide(trophy);
    });
    rowsRoot.append(item);
  }
}

function openGuide(trophy) {
  openTrophyId = trophy.id;
  const hidden = spoilersHide(trophy);
  detailRoot.replaceChildren();

  const title = document.createElement('h2');
  title.textContent = hidden ? 'Hidden story trophy' : trophy.name;
  const chips = document.createElement('p');
  chips.className = 'chip-row';
  chips.append(
    tagChip(gradeWord(trophy) + ' · ' + trophy.kind),
    tagChip('Roadmap stage ' + trophy.stage),
    tagChip('Time: ' + trophy.time),
    tagChip('Difficulty: ' + difficultyText(trophy)),
  );
  if (trophy.missable) chips.append(tagChip('⚠ Missable', 'chip-warn'));
  const blurb = document.createElement('p');
  blurb.className = 'trophy-desc';
  blurb.textContent = hidden
    ? 'Spoilers hidden — tick this trophy earned to reveal it.'
    : trophy.description;
  detailRoot.append(title, chips, blurb);
  if (hidden) return;

  if (trophy.missable) {
    const warning = document.createElement('p');
    warning.className = 'missable-note';
    warning.textContent = 'Possibly missable: this trophy is tied to a moment that may not come back. Keep a manual save before attempting it.';
    detailRoot.append(warning);
  }

  const guideHeading = document.createElement('h4');
  guideHeading.textContent = 'Guide';
  const guideText = document.createElement('p');
  guideText.className = 'guide-text';
  guideText.textContent = trophy.guide;
  detailRoot.append(guideHeading, guideText);

  const stepsHeading = document.createElement('h4');
  stepsHeading.textContent = 'Steps';
  const stepsList = document.createElement('ol');
  for (const step of trophy.steps) {
    const stepItem = document.createElement('li');
    stepItem.textContent = step;
    stepsList.append(stepItem);
  }
  detailRoot.append(stepsHeading, stepsList);

  if (trophy.tips && trophy.tips.length) {
    const tipsHeading = document.createElement('h4');
    tipsHeading.textContent = 'Tips';
    const tipsList = document.createElement('ul');
    for (const tip of trophy.tips) {
      const tipItem = document.createElement('li');
      tipItem.textContent = tip;
      tipsList.append(tipItem);
    }
    detailRoot.append(tipsHeading, tipsList);
  }

  if (trophy.pitfalls && trophy.pitfalls.length) {
    const pitfallsHeading = document.createElement('h4');
    pitfallsHeading.textContent = 'Watch out for';
    const pitfallsList = document.createElement('ul');
    pitfallsList.className = 'pitfall-list';
    for (const pitfall of trophy.pitfalls) {
      const pitfallItem = document.createElement('li');
      pitfallItem.textContent = pitfall;
      pitfallsList.append(pitfallItem);
    }
    detailRoot.append(pitfallsHeading, pitfallsList);
  }

  const sourcesHeading = document.createElement('h4');
  sourcesHeading.textContent = 'Sources';
  const sourcesList = document.createElement('ul');
  sourcesList.className = 'source-list';
  for (const source of trophy.sources) {
    const sourceItem = document.createElement('li');
    sourceItem.textContent = source;
    sourcesList.append(sourceItem);
  }
  detailRoot.append(sourcesHeading, sourcesList);

  // Personal note, kept in this browser only — a place for your own
  // observations (a location, a loadout, a time) that the guide does not know.
  const noteHeading = document.createElement('h4');
  noteHeading.textContent = 'Your note';
  const noteBox = document.createElement('textarea');
  noteBox.className = 'note-box';
  noteBox.rows = 3;
  noteBox.placeholder = 'Your own note for this trophy — a location, a loadout, a time… (saved in this browser only)';
  noteBox.value = notes[trophy.name] ?? '';
  noteBox.addEventListener('input', () => {
    if (noteBox.value.trim()) notes[trophy.name] = noteBox.value;
    else delete notes[trophy.name];
    persistNotes();
  });
  detailRoot.append(noteHeading, noteBox);

  const actions = document.createElement('p');
  actions.className = 'detail-actions';
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'read-guide-btn';
  copyBtn.textContent = 'Copy guide as text';
  copyBtn.addEventListener('click', async () => {
    const lines = [
      trophy.name + ' (' + gradeWord(trophy) + ') — ' + trophy.description,
      '',
      trophy.guide,
      '',
      'Steps:',
      ...trophy.steps.map((s, i) => (i + 1) + '. ' + s),
    ];
    if (trophy.tips && trophy.tips.length) lines.push('', 'Tips:', ...trophy.tips.map((t) => '- ' + t));
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = 'Copy guide as text'; }, 2000);
    } catch {
      copyBtn.textContent = 'Copy failed — select the text instead';
    }
  });
  const earnBtn = document.createElement('button');
  earnBtn.type = 'button';
  earnBtn.className = 'read-guide-btn';
  earnBtn.textContent = earnedNames.has(trophy.name) ? 'Mark as not earned' : 'Mark as earned';
  earnBtn.addEventListener('click', () => {
    if (earnedNames.has(trophy.name)) earnedNames.delete(trophy.name);
    else earnedNames.add(trophy.name);
    persistEarned();
    paintList();
    openGuide(trophy);
  });
  actions.append(copyBtn, earnBtn);
  detailRoot.append(actions);
}

function paintRoadmap() {
  const root = document.getElementById('roadmap');
  root.replaceChildren();
  for (const [stage, [title, note]] of Object.entries(ROADMAP)) {
    const inStage = allTrophies.filter((t) => t.stage === Number(stage));
    const earned = inStage.filter((t) => earnedNames.has(t.name)).length;
    const block = document.createElement('div');
    block.className = 'roadmap-stage';
    const heading = document.createElement('h3');
    heading.textContent = 'Stage ' + stage + ' — ' + title + ' (' + earned + '/' + inStage.length + ')';
    const noteEl = document.createElement('p');
    noteEl.textContent = note;
    const bar = document.createElement('div');
    bar.className = 'progress-track';
    const fill = document.createElement('div');
    fill.className = 'roadmap-fill';
    fill.style.width = (inStage.length ? Math.round((earned / inStage.length) * 100) : 0) + '%';
    bar.append(fill);
    const list = document.createElement('ul');
    for (const trophy of inStage) {
      const item = document.createElement('li');
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'roadmap-link';
      link.textContent = trophy.name + ' (' + gradeWord(trophy) + ')'
        + (trophy.missable ? ' — ⚠ missable' : '')
        + (earnedNames.has(trophy.name) ? ' ✓' : '');
      link.addEventListener('click', () => {
        showPane('checklist');
        openGuide(trophy);
      });
      item.append(link);
      list.append(item);
    }
    block.append(heading, noteEl, bar, list);
    root.append(block);
  }
}

function paintMissables() {
  const root = document.getElementById('missables');
  root.replaceChildren();
  for (const trophy of allTrophies.filter((t) => t.missable)) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const heading = document.createElement('h3');
    heading.textContent = trophy.name;
    const text = document.createElement('p');
    text.textContent = trophy.guide;
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'read-guide-btn';
    openBtn.textContent = 'Read full guide';
    openBtn.addEventListener('click', () => {
      showPane('checklist');
      openGuide(trophy);
    });
    card.append(heading, text, openBtn);
    root.append(card);
  }
}

function showPane(name) {
  for (const tab of document.querySelectorAll('.view-tabs button')) {
    tab.classList.toggle('active', tab.dataset.view === name);
  }
  for (const pane of ['checklist', 'roadmap', 'missables']) {
    document.getElementById('view-' + pane).hidden = pane !== name;
  }
  if (name === 'roadmap') paintRoadmap();
  if (name === 'missables') paintMissables();
}
for (const tab of document.querySelectorAll('.view-tabs button')) {
  tab.addEventListener('click', () => showPane(tab.dataset.view));
}

for (const control of [searchBox, gradeBox, kindBox, stageBox, missableBox]) {
  control.addEventListener('input', paintList);
  control.addEventListener('change', paintList);
}
sortBox.addEventListener('change', () => {
  localStorage.setItem(SORT_STORE_KEY, sortBox.value);
  paintList();
});
spoilerBox.addEventListener('change', () => {
  localStorage.setItem(SPOILER_STORE_KEY, spoilerBox.checked ? '1' : '0');
  paintList();
  if (openTrophyId) {
    const trophy = allTrophies.find((t) => t.id === openTrophyId);
    if (trophy) openGuide(trophy);
  }
});
document.getElementById('export').addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify({ earned: [...earnedNames], notes }, null, 1)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
});
document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    // New format carries { earned, notes }; the old format was a bare array
    // of earned trophy names, which still imports cleanly.
    const names = Array.isArray(parsed) ? parsed : (parsed.earned ?? []);
    earnedNames = new Set(names.filter((name) => allTrophies.some((t) => t.name === name)));
    if (!Array.isArray(parsed) && parsed.notes && typeof parsed.notes === 'object') {
      notes = {};
      for (const [name, text] of Object.entries(parsed.notes)) {
        if (allTrophies.some((t) => t.name === name) && typeof text === 'string') notes[name] = text;
      }
      persistNotes();
    }
    persistEarned();
    paintList();
  } catch {
    alert('That file is not a valid progress export.');
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies and notes?')) {
    earnedNames = new Set();
    notes = {};
    persistEarned();
    persistNotes();
    paintList();
  }
});

// Keyboard shortcut: "/" focuses the search box, Escape clears it.
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== searchBox) {
    event.preventDefault();
    searchBox.focus();
  } else if (event.key === 'Escape' && document.activeElement === searchBox) {
    searchBox.value = '';
    paintList();
    searchBox.blur();
  }
});

// Deep links for screenshots and sharing: ?view=roadmap|missables, ?t=<id>, ?demo=1, ?spoiler=1
const startView = query.get('view');
if (startView === 'roadmap' || startView === 'missables') showPane(startView);
const trophyParam = query.get('t');
if (trophyParam) {
  const trophy = allTrophies.find((t) => String(t.id) === trophyParam);
  if (trophy) openGuide(trophy);
}
if (query.get('grade')) gradeBox.value = query.get('grade');
if (query.get('q')) searchBox.value = query.get('q');

paintRoadmap();
paintMissables();
paintList();
