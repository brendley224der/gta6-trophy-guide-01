// Leonida Platinum — GTA VI trophy guide entry (Node 22, standard library only).
//
// The guide itself is plain static files under app/: index.html, its module and
// stylesheet, and app/data/trophies.json with the 55 official trophies and a guide
// for each. It opens in a browser and works with the network off — nothing is
// fetched from outside app/. This file is only the hand-in: it copies app/ and
// screenshots/ into /output and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library. Do not change
// vendor/makefun-frontend.ts: the scorer rebuilds the dossier with its own copy
// of that library and expects the two to match byte for byte.
//
// Rebuilt 2026-11-19: every trophy guide in app/data/trophies.json was rewritten
// in full (concrete steps, tips, pitfalls and a 1-5 difficulty rating per trophy),
// and app.js gained sorting, per-grade and per-stage progress bars, a next-up
// suggestion, per-trophy notes and a copy-guide button.
//
// Run it locally with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide itself with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files and directories in app/,
// or 48 MiB of app files (app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
