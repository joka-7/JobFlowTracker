import { test, expect } from '@playwright/test';
import { initJobSeekerApp, fillLabeledInput, saveForm } from './helpers.js';

test.describe('Job seeker mode flows', () => {
  test.beforeEach(async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
  });

  test('add company and see on kanban board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Acme Corp');
    await fillLabeledInput(page, /^Role$/i, 'Backend Developer');
    await saveForm(page);

    await page.getByRole('button', { name: /Status Board/i }).click();
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText(/^Applied/i)).toBeVisible();
  });

  test('job seeker data persists in mode-scoped localStorage', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Beta Inc');
    await saveForm(page);

    const stored = await page.evaluate(() => localStorage.getItem('jobTrackerAppV2Data_jobseeker'));
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored).some(c => c.name === 'Beta Inc')).toBe(true);
  });

  test('keyboard shortcut N opens add form', async ({ page }) => {
    await page.keyboard.press('n');
    await expect(page.getByRole('heading', { name: /Add New Company/i })).toBeVisible();
  });

  test('export downloads JSON backup', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Export Test Co');
    await saveForm(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle(/Download backup/i).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/job-tracker-backup.*\.json/);
  });
});
