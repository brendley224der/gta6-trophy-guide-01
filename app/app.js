// Leonida Platinum — GTA VI trophy guide & tracker. Static, offline, no libraries.
// Earned trophies persist in localStorage; export/import round-trips them as JSON.
const STORE_KEY = 'gta6-trophy-checklist-v2';
const SPOILER_STORE_KEY = 'gta6-trophy-spoilers-v2';

const ROADMAP = {
  1: ['Story playthrough', 'Play Chapters 1-4 and the story missions in order. Nothing here is missable — just enjoy the story and learn the map.'],
  2: ['Finale & partners', 'Finish the final mission and the partner-linked trophies. Keep a manual save before partner missions and big story choices.'],
  3: ['Side content', 'Stranger strands, activities, collectibles and exploration — meditation spots, cards, WAiNK locations, vehicles and regions.'],
  4: ['Grind & cleanup', 'The counted grinds: 250 stunts, 20 races, 50 challenges, 42 gold Shooting Range medals, 5 bank vaults, $250k laundered.'],
  5: ['Platinum', 'Attain 100% completion and the platinum pops with the last trophy. Check the in-game Stats tracker before the final push.'],
};
// 13 of 55 earned, demo seed only (?demo=1) so screenshots show progress.
const DEMO_EARNED_IDS = [2, 3, 4, 5, 8, 9, 10, 15, 16, 21, 44, 46, 53];

const query = new URLSearchParams(location.search);
const data = await (await fetch('data/trophies.json')).json();
const allTrophies = data.trophies;

let earnedNames = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
if (query.get('demo') === '1' && !localStorage.getItem(STORE_KEY)) {
  earnedNames = new Set(DEMO_EARNED_IDS.map((id) => allTrophies.find((t) => t.id === id).name));
  persistEarned();
}

const searchBox = document.getElementById('q');
const gradeBox = document.getElementById('grade');
const kindBox = document.getElementById('kind');
const stageBox = document.getElementById('stage');
const missableBox = document.getElementById('missableOnly');
const spoilerBox = document.getElementById('spoiler');
const rowsRoot = document.getElementById('rows');
const detailRoot = document.getElementById('detail');
let openTrophyId = null;

spoilerBox.checked = localStorage.getItem(SPOILER_STORE_KEY) === '1' || query.get('spoiler') === '1';

function persistEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earnedNames]));
}

function gradeWord(trophy) {
  return trophy.grade[0].toUpperCase() + trophy.grade.slice(1);
}

function spoilersHide(trophy) {
  return spoilerBox.checked && trophy.kind === 'story' && !earnedNames.has(trophy.name);
}

function matchingTrophies() {
  const needle = searchBox.value.trim().toLowerCase();
  return allTrophies.filter((trophy) => {
    if (gradeBox.value !== 'all' && trophy.grade !== gradeBox.value) return false;
    if (kindBox.value !== 'all' && trophy.kind !== kindBox.value) return false;
    if (stageBox.value !== 'all' && String(trophy.stage) !== stageBox.value) return false;
    if (missableBox.checked && !trophy.missable) return false;
    if (needle && !(trophy.name + ' ' + trophy.description + ' ' + trophy.guide).toLowerCase().includes(needle)) return false;
    return true;
  });
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
      tagChip(earnedNames.has(trophy.name) ? 'Earned ✓' : 'Not earned'),
    );
    if (trophy.missable) chips.append(tagChip('⚠ Missable — save first', 'chip-warn'));
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
  const stepsHeading = document.createElement('h4');
  stepsHeading.textContent = 'Steps';
  const stepsList = document.createElement('ol');
  for (const step of trophy.steps) {
    const stepItem = document.createElement('li');
    stepItem.textContent = step;
    stepsList.append(stepItem);
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
  detailRoot.append(guideHeading, guideText, stepsHeading, stepsList, sourcesHeading, sourcesList);
}

function paintRoadmap() {
  const root = document.getElementById('roadmap');
  root.replaceChildren();
  for (const [stage, [title, note]] of Object.entries(ROADMAP)) {
    const block = document.createElement('div');
    block.className = 'roadmap-stage';
    const heading = document.createElement('h3');
    heading.textContent = 'Stage ' + stage + ' — ' + title;
    const noteEl = document.createElement('p');
    noteEl.textContent = note;
    const list = document.createElement('ul');
    for (const trophy of allTrophies.filter((t) => t.stage === Number(stage))) {
      const item = document.createElement('li');
      item.textContent = trophy.name + ' (' + gradeWord(trophy) + ')'
        + (trophy.missable ? ' — ⚠ missable' : '')
        + (earnedNames.has(trophy.name) ? ' ✓' : '');
      list.append(item);
    }
    block.append(heading, noteEl, list);
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
}
for (const tab of document.querySelectorAll('.view-tabs button')) {
  tab.addEventListener('click', () => showPane(tab.dataset.view));
}

for (const control of [searchBox, gradeBox, kindBox, stageBox, missableBox]) {
  control.addEventListener('input', paintList);
  control.addEventListener('change', paintList);
}
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
  link.href = URL.createObjectURL(new Blob([JSON.stringify([...earnedNames], null, 1)], { type: 'application/json' }));
  link.download = 'gta6-trophy-progress.json';
  link.click();
});
document.getElementById('import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const names = JSON.parse(await file.text());
    earnedNames = new Set(names.filter((name) => allTrophies.some((t) => t.name === name)));
    persistEarned();
    paintList();
  } catch {
    alert('That file is not a valid progress export.');
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earnedNames = new Set();
    persistEarned();
    paintList();
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
