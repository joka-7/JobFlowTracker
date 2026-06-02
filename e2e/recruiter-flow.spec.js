import { test, expect } from '@playwright/test';
import { initRecruiterApp, fillLabeledInput, saveForm } from './helpers.js';

test.describe('Recruiter mode flows', () => {
  test.beforeEach(async ({ page }) => {
    await initRecruiterApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();
  });

  test('add candidate via list form and see on board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Jane Doe');
    await fillLabeledInput(page, /Position Applied/i, 'Senior Engineer');
    await saveForm(page);

    await page.getByRole('button', { name: /Status Board/i }).click();
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('Senior Engineer')).toBeVisible();
    await expect(page.getByText(/Application Received/i)).toBeVisible();
  });

  test('recruiter data persists in mode-scoped localStorage', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Bob Smith');
    await saveForm(page);

    const stored = await page.evaluate(() => localStorage.getItem('jobTrackerAppV2Data_recruiter'));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored);
    expect(parsed.some(c => c.name === 'Bob Smith')).toBe(true);
  });

  test('stats tab shows recruiter labels', async ({ page }) => {
    await page.getByRole('button', { name: 'Statistics', exact: true }).click();
    await expect(page.getByText('Active Pipeline')).toBeVisible();
    await expect(page.getByText('Candidates', { exact: true })).toBeVisible();
  });

  test('AI assistant panel is not visible in recruiter mode', async ({ page }) => {
    await expect(page.locator('text=Interview prep')).toHaveCount(0);
  });
});
