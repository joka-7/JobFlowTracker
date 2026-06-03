import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { E2E_MODE_INIT, STORAGE_KEYS } from '../storageKeys.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('E2E storage key parity', () => {
  it('tasks preset skips Task Manager welcome modal', () => {
    expect(E2E_MODE_INIT.tasks[STORAGE_KEYS.tasksWelcome]).toBe('1');
    expect(E2E_MODE_INIT.tasks[STORAGE_KEYS.appMode]).toBe('tasks');
  });

  it('job seeker preset skips onboarding wizard', () => {
    expect(E2E_MODE_INIT.jobseeker[STORAGE_KEYS.jobSeekerOnboarding]).toBe('1');
  });

  it('job seeker preset includes mock AI keys for chat e2e', () => {
    expect(E2E_MODE_INIT.jobseeker.aiApiKey).toBe('e2e-test-key');
    expect(E2E_MODE_INIT.jobseeker.aiProvider).toBe('gemini');
  });

  it('e2e helpers use shared modeInit presets (not ad-hoc keys)', () => {
    const helpers = readFileSync(join(root, 'e2e/helpers.js'), 'utf8');
    const modeInit = readFileSync(join(root, 'e2e/modeInit.js'), 'utf8');
    expect(modeInit).toContain('E2E_MODE_INIT');
    expect(helpers).toContain("applyModeInit(page, 'tasks')");
    expect(helpers).toContain("applyModeInit(page, 'jobseeker')");
    expect(helpers).toContain("applyModeInit(page, 'recruiter')");
    expect(helpers).toContain('dismissBlockingOverlays');
    expect(helpers).toContain('startMockInterview');
    expect(helpers).toContain("getByTestId('open-templates')");
  });
});
