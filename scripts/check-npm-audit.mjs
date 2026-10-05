#!/usr/bin/env node
// Gate on `npm audit --json`, but let specific advisories be allowlisted via
// .npmauditignore (same convention as .trivyignore) for cases with no
// non-breaking fix available yet. Without this, such an advisory blocks CI
// forever until someone remembers to re-check it manually.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const AUDIT_LEVEL = 'high';
const SEVERITY_RANK = { low: 0, moderate: 1, high: 2, critical: 3 };
const ignorePath = new URL('../.npmauditignore', import.meta.url);

function parseIgnoreFile() {
  let text;
  try {
    text = readFileSync(ignorePath, 'utf8');
  } catch {
    return new Map();
  }
  const entries = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(GHSA-\S+)\s+exp:(\d{4}-\d{2}-\d{2})$/);
    if (!match) {
      throw new Error(`Malformed .npmauditignore line: "${trimmed}"`);
    }
    entries.set(match[1], match[2]);
  }
  return entries;
}

function runAudit() {
  try {
    const out = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
    return JSON.parse(out);
  } catch (err) {
    // npm audit exits non-zero when it finds vulnerabilities; stdout still
    // carries the JSON report in that case.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const ignored = parseIgnoreFile();
const today = new Date().toISOString().slice(0, 10);
const report = runAudit();

const unignored = [];
const activeIgnores = new Set();

for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  if (SEVERITY_RANK[vuln.severity] < SEVERITY_RANK[AUDIT_LEVEL]) continue;
  for (const item of vuln.via) {
    if (typeof item !== 'object') continue;
    const ghsaId = item.url?.match(/advisories\/(GHSA-\S+)/)?.[1];
    if (!ghsaId) continue;
    const expiry = ignored.get(ghsaId);
    if (expiry && expiry >= today) {
      activeIgnores.add(ghsaId);
      continue;
    }
    unignored.push({ package: vuln.name, ghsaId, title: item.title, expired: Boolean(expiry) });
  }
}

for (const ghsaId of activeIgnores) {
  console.log(`✓ ${ghsaId} ignored (see .npmauditignore)`);
}

if (unignored.length > 0) {
  console.error(`\n${unignored.length} unignored ${AUDIT_LEVEL}+ severity advisor${unignored.length === 1 ? 'y' : 'ies'}:`);
  for (const { package: pkg, ghsaId, title, expired } of unignored) {
    console.error(`✗ ${pkg}: ${title} (${ghsaId})${expired ? ' — ignore entry expired, needs review' : ''}`);
  }
  console.error('\nRun "npm audit" for full details.');
  process.exit(1);
}

console.log('\n✓ No unignored high+ severity advisories');
