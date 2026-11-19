// Leonida Platinum — the hand-in for the GTA VI trophy guide entry.
//
// The guide itself is plain static files under app/ (index.html, app.js,
// style.css, data/trophies.json). It opens in desktop Chrome with the network
// off: everything it loads lives under app/, so this file only has to gather
// the entry and write the dossier the judge reads. The dossier comes from the
// vendored make.fun library — never edit vendor/makefun-frontend.ts, because
// the scorer rebuilds the dossier with its own copy of that library and the
// two have to match byte for byte.
//
// Run it with a stand-in output dir while developing:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it with /output. Serve the guide itself with:
//   node serve.ts        (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Where the entry lives, and where the hand-in goes. MAKEFUN_OUTPUT_DIR is
// the local stand-in for the grader's /output.
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, from the kit's reference/gate.json. Only
// text_max_bytes shapes the dossier's bytes; the other limits refuse an
// entry the scorer would refuse anyway — more than 4 screenshots, one over
// 256 KiB, more than 993 files and directories under app/, or 48 MiB of app
// files (app/ is counted beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function handIn() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
  const shots = join(here, 'screenshots');
  if (existsSync(shots)) {
    cpSync(shots, join(outDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_OPTIONS));
}

handIn();
