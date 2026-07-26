#!/usr/bin/env node
// Bundle-size budget: fails CI if the built JS grows past a threshold without
// anyone noticing. Catches the "one component ballooned to 500kB" case the
// original audit flagged, without needing a bundle-analyzer dependency.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');
const PER_CHUNK_GZIP_BUDGET_KB = 200;
const TOTAL_GZIP_BUDGET_KB = 550;

function gzipKb(filePath) {
  const raw = readFileSync(filePath);
  return gzipSync(raw).length / 1024;
}

let entries;
try {
  entries = readdirSync(ASSETS_DIR).filter(f => f.endsWith('.js'));
} catch {
  console.error(`Bundle-size check: could not read ${ASSETS_DIR}. Run "npm run build" first.`);
  process.exit(1);
}

let totalKb = 0;
let failed = false;

for (const file of entries) {
  const filePath = join(ASSETS_DIR, file);
  if (!statSync(filePath).isFile()) continue;
  const kb = gzipKb(filePath);
  totalKb += kb;
  if (kb > PER_CHUNK_GZIP_BUDGET_KB) {
    console.error(`✗ ${file}: ${kb.toFixed(1)} kB gzip exceeds per-chunk budget of ${PER_CHUNK_GZIP_BUDGET_KB} kB`);
    failed = true;
  }
}

console.log(`Total JS (gzip): ${totalKb.toFixed(1)} kB (budget: ${TOTAL_GZIP_BUDGET_KB} kB)`);
if (totalKb > TOTAL_GZIP_BUDGET_KB) {
  console.error(`✗ Total JS bundle size exceeds budget of ${TOTAL_GZIP_BUDGET_KB} kB`);
  failed = true;
}

if (failed) {
  console.error('\nBundle-size budget exceeded. If this growth is expected, raise the budget in scripts/check-bundle-size.mjs alongside this change.');
  process.exit(1);
}

console.log('✓ Bundle size within budget');
