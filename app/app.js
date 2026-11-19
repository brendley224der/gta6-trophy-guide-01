// Leonida Platinum — GTA VI trophy guide & tracker (offline, static, no libraries).
// Progress saves in localStorage; export/import round-trips it as JSON.
const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoilers';
const STAGES = {
  1: ['Story playthrough', 'Play Chapters 1-4 and the story missions in order. Nothing here is missable — just enjoy the story and learn the map.'],
  2: ['Finale & partners', 'Finish the final mission and the partner-linked trophies. Keep a manual save before partner missions and big story choices.'],
  3: ['Side content', 'Stranger strands, activities, collectibles and exploration — meditation spots, cards, WAiNK locations, vehicles and regions.'],
  4: ['Grind & cleanup', 'The counted grinds: 250 stunts, 20 races, 50 challenges, 42 gold Shooting Range medals, 5 bank vaults, $250k laundered.'],
  5: ['Platinum', 'Attain 100% completion and the platinum pops with the last trophy. Check the in-game Stats tracker before the final push.'],
};
const DEMO_EARNED = [2, 3, 4, 5, 8, 9, 10, 15, 16, 21, 44, 46, 53]; // 13 of 55, demo seed only (?demo=1)

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
if (params.get('demo') === '1' && !localStorage.getItem(KEY)) {
  earned = new Set(DEMO_EARNED.map((id) => trophies.find((t) => t.id === id).name));
  save();
}
const spoilerBox = document.getElementById('spoiler');
spoilerBox.checked = localStorage.getItem(SPOILER_KEY) === '1' || params.get('spoiler') === '1';

const rowsEl = document.getElementById('rows');
const qEl = document.getElementById('q');
const gradeEl = document.getElementById('grade');
const kindEl = document.getElementById('kind');
const stageEl = document.getElementById('stage');
const missableOnlyEl = document.getElementById('missableOnly');
const detailEl = document.getElementById('detail');
let selectedId = null;

function save() { localStorage.setItem(KEY, JSON.stringify([...earned])); }

function gradeLabel(t) { return t.grade[0].toUpperCase() + t.grade.slice(1); }
function isHidden(t) { return spoilerBox.checked && t.kind === 'story' && !earned.has(t.name); }

function filtered() {
  const q = qEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (kindEl.value !== 'all' && t.kind !== kindEl.value) return false;
    if (stageEl.value !== 'all' && String(t.stage) !== stageEl.value) return false;
    if (missableOnlyEl.checked && !t.missable) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
}

function render() {
  const list = filtered();
  document.getElementById('countLine').textContent =
    `Showing ${list.length} of 55 trophies · ${earned.size} earned`;
  document.getElementById('earnedCount').textContent = earned.size;
  document.getElementById('barFill').style.width = `${Math.round((earned.size / 55) * 100)}%`;
  document.getElementById('progressText').textContent =
    `${Math.round((earned.size / 55) * 100)}% to the platinum`;
  document.getElementById('missCount').textContent =
    `(${trophies.filter((t) => t.missable).length})`;

  rowsEl.replaceChildren();
  for (const t of list) {
    const li = document.createElement('li');
    li.className = 'row grade-' + t.grade + (earned.has(t.name) ? ' earned' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', 'Earned: ' + t.name);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name); else earned.delete(t.name);
      save(); render();
      if (selectedId === t.id) showDetail(t);
    });
    const mid = document.createElement('div');
    const h = document.createElement('h3');
    if (isHidden(t)) {
      h.textContent = 'Hidden story trophy — earn it to reveal';
    } else {
      const dot = document.createElement('span');
      dot.className = 'grade-dot';
      h.append(dot, document.createTextNode(t.name));
    }
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = isHidden(t) ? 'Spoilers hidden. Tick it earned to reveal the name and guide.' : t.description;
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.innerHTML = '';
    const tags = [
      gradeLabel(t) + ' · ' + t.kind,
      'Stage ' + t.stage,
      t.time,
      earned.has(t.name) ? 'Earned ✓' : 'Not earned',
    ];
    for (const tag of tags) {
      const s = document.createElement('span');
      s.className = 'tag'; s.textContent = tag; meta.append(s);
    }
    if (t.missable) {
      const s = document.createElement('span');
      s.className = 'tag miss'; s.textContent = '⚠ Missable — save first'; meta.append(s);
    }
    mid.append(h, desc, meta);
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'guide-btn';
    btn.textContent = isHidden(t) ? 'Why hidden?' : 'Read guide';
    btn.addEventListener('click', (e) => { e.stopPropagation(); showDetail(t); });
    li.append(box, mid, btn);
    li.addEventListener('click', (e) => { if (e.target !== box) showDetail(t); });
    rowsEl.append(li);
  }
}

function showDetail(t) {
  selectedId = t.id;
  detailEl.replaceChildren();
  const h = document.createElement('h2');
  h.textContent = isHidden(t) ? 'Hidden story trophy' : t.name;
  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.innerHTML = '';
  for (const tag of [gradeLabel(t) + ' · ' + t.kind, 'Roadmap stage ' + t.stage, 'Time: ' + t.time]) {
    const s = document.createElement('span');
    s.className = 'tag'; s.textContent = tag; meta.append(s);
  }
  if (t.missable) {
    const s = document.createElement('span');
    s.className = 'tag miss'; s.textContent = '⚠ Missable'; meta.append(s);
  }
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isHidden(t) ? 'Spoilers hidden — tick this trophy earned to reveal it.' : t.description;
  detailEl.append(h, meta, desc);
  if (isHidden(t)) return;
  if (t.missable) {
    const w = document.createElement('p');
    w.className = 'warn';
    w.textContent = 'Possibly missable: this trophy is tied to a moment that may not come back. Keep a manual save before attempting it.';
    detailEl.append(w);
  }
  const gTitle = document.createElement('h4'); gTitle.textContent = 'Guide';
  const g = document.createElement('p'); g.className = 'guide'; g.textContent = t.guide;
  const sTitle = document.createElement('h4'); sTitle.textContent = 'Steps';
  const ol = document.createElement('ol');
  for (const step of t.steps) {
    const li = document.createElement('li'); li.textContent = step; ol.append(li);
  }
  const srcTitle = document.createElement('h4'); srcTitle.textContent = 'Sources';
  const ul = document.createElement('ul'); ul.className = 'sources';
  for (const s of t.sources) {
    const li = document.createElement('li'); li.textContent = s; ul.append(li);
  }
  detailEl.append(gTitle, g, sTitle, ol, srcTitle, ul);
}

function renderRoadmap() {
  const el = document.getElementById('roadmap');
  el.replaceChildren();
  for (const [stage, [title, note]] of Object.entries(STAGES)) {
    const block = document.createElement('div');
    block.className = 'stage-block';
    const h = document.createElement('h3');
    h.textContent = `Stage ${stage} — ${title}`;
    const p = document.createElement('p'); p.textContent = note;
    const ul = document.createElement('ul');
    for (const t of trophies.filter((x) => x.stage === Number(stage))) {
      const li = document.createElement('li');
      li.textContent = `${t.name} (${gradeLabel(t)})${t.missable ? ' — ⚠ missable' : ''}${earned.has(t.name) ? ' ✓' : ''}`;
      ul.append(li);
    }
    block.append(h, p, ul);
    el.append(block);
  }
}

function renderMissables() {
  const el = document.getElementById('missables');
  el.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div');
    card.className = 'miss-card';
    const h = document.createElement('h3'); h.textContent = t.name;
    const p = document.createElement('p'); p.textContent = t.guide;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'guide-btn'; b.textContent = 'Read full guide';
    b.addEventListener('click', () => { switchView('checklist'); showDetail(t); });
    card.append(h, p, b);
    el.append(card);
  }
}

function switchView(name) {
  for (const btn of document.querySelectorAll('.tabs button')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  for (const v of ['checklist', 'roadmap', 'missables']) {
    document.getElementById('view-' + v).hidden = v !== name;
  }
}
for (const btn of document.querySelectorAll('.tabs button')) {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
}

for (const el of [qEl, gradeEl, kindEl, stageEl, missableOnlyEl]) {
  el.addEventListener('input', render);
  el.addEventListener('change', render);
}
spoilerBox.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? '1' : '0');
  render();
  if (selectedId) { const t = trophies.find((x) => x.id === selectedId); if (t) showDetail(t); }
});
document.getElementById('export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify([...earned], null, 1)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const names = JSON.parse(await file.text());
    earned = new Set(names.filter((n) => trophies.some((t) => t.name === n)));
    save(); render();
  } catch { alert('That file is not a valid progress export.'); }
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) { earned = new Set(); save(); render(); }
});

// Deep links for screenshots and sharing: ?view=roadmap|missables, ?t=<id>, ?demo=1, ?spoiler=1
const view = params.get('view');
if (view === 'roadmap' || view === 'missables') switchView(view);
const tParam = params.get('t');
if (tParam) { const t = trophies.find((x) => String(x.id) === tParam); if (t) showDetail(t); }
if (params.get('grade')) { gradeEl.value = params.get('grade'); }
if (params.get('q')) { qEl.value = params.get('q'); }

renderRoadmap();
renderMissables();
render();
