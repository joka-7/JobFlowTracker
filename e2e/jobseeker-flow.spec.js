import { test, expect } from '@playwright/test';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  initJobSeekerApp, fillLabeledInput, selectLabeledOption, saveForm,
  goToBoardTab, goToListTab, acceptNextDialog, dragCardToColumn,
} from './helpers.js';

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

    // Force the classic-download fallback: the File System Access API ("Save As"
    // with folder choice) opens a native dialog Playwright can't drive.
    await page.evaluate(() => { delete window.showSaveFilePicker; });

    const downloadPromise = page.waitForEvent('download');
    await page.getByTitle(/Download backup/i).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/job-tracker-backup.*\.json/);
  });

  test('import JSON backup loads companies', async ({ page }) => {
    const filePath = join(tmpdir(), `jobflow-import-${Date.now()}.json`);
    await writeFile(filePath, JSON.stringify([
      { id: 'import-1', name: 'Imported Co', role: 'Engineer', status: 'applied' },
    ]));

    await page.locator('#main-file-upload').setInputFiles(filePath);
    await expect(page.getByText('File loaded successfully!')).toBeVisible();
    await goToBoardTab(page);
    await expect(page.getByText('Imported Co')).toBeVisible();
    await expect(page.getByText('Engineer')).toBeVisible();

    await unlink(filePath);
  });

  test('drag company to new status column on board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Drag Co');
    await saveForm(page);

    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'HR Anchor Co');
    await selectLabeledOption(page, /Process Status/i, 'hr_call');
    await saveForm(page);

    await goToBoardTab(page);
    await dragCardToColumn(page, 'Drag Co', /^HR Call \(\d+\)$/);

    const hrCol = page.locator('.board-column').filter({ has: page.getByText(/^HR Call \(\d+\)$/) });
    await expect(hrCol.getByText('Drag Co')).toBeVisible();
  });

  test('edit company updates name on board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Before Edit');
    await saveForm(page);

    await goToListTab(page);
    await page.getByRole('button', { name: /Edit Details/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'After Edit');
    await saveForm(page);

    await goToBoardTab(page);
    await expect(page.getByText('After Edit')).toBeVisible();
    await expect(page.getByText('Before Edit')).toHaveCount(0);
  });

  test('delete company removes from list and board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/i }).click();
    await fillLabeledInput(page, /Company Name/i, 'Delete Me Co');
    await saveForm(page);

    await goToListTab(page);
    acceptNextDialog(page);
    await page.getByTitle(/Delete Company/i).click();
    await expect(page.getByText('Company deleted.')).toBeVisible();

    await goToListTab(page);
    await expect(page.getByText('Delete Me Co')).toHaveCount(0);
    await goToBoardTab(page);
    await expect(page.getByText('Delete Me Co')).toHaveCount(0);
  });
});
