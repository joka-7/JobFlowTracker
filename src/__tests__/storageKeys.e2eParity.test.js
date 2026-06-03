import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../storageKeys.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('E2E storage key parity', () => {
  it('tasks e2e helper uses the Task Manager welcome key', () => {
    const helpers = readFileSync(join(root, 'e2e/helpers.js'), 'utf8');
    expect(helpers).toContain('hasCompletedOnboarding_tasks');
  });
});
