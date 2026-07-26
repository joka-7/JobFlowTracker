import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../storageKeys.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const helpers = readFileSync(join(root, 'e2e/helpers.js'), 'utf8');

/**
 * e2e/helpers.js hardcodes its own localStorage key literals rather than
 * importing STORAGE_KEYS (they run in a Playwright page context, not this
 * Node/Vitest one). This guards that the two copies stay in sync.
 *
 * `enabledModes` is excluded: it's optional multi-mode config that
 * getEnabledModes() defaults to null for, so init helpers have no reason
 * to set it.
 */
const KEYS_REQUIRED_IN_HELPERS = Object.entries(STORAGE_KEYS)
  .filter(([name]) => name !== 'enabledModes');

describe('E2E storage key parity', () => {
  it.each(KEYS_REQUIRED_IN_HELPERS)('helpers.js uses the canonical value for STORAGE_KEYS.%s', (_name, value) => {
    expect(helpers).toContain(value);
  });
});
