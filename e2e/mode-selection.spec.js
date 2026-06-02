import { test, expect } from '@playwright/test';
import { clearAppStorage, chooseJobSeekerMode, chooseRecruiterMode, initJobSeekerApp, initRecruiterApp, fillLabeledInput, saveForm } from './helpers.js';

test.describe('Mode selection (first launch)', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
    await page.goto('/');
  });

  test('shows job seeker and recruiter choices', async ({ page }) => {
    await expect(page.getByText(/How will you use JobFlowTracker/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Job Seeker/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Recruiter/i })).toBeVisible();
  });

  test('choosing job seeker persists appMode and loads job seeker UI', async ({ page }) => {
    await chooseJobSeekerMode(page);
    const appMode = await page.evaluate(() => localStorage.getItem('appMode'));
    expect(appMode).toBe('jobseeker');
    await expect(page.getByRole('button', { name: /Add Company/i })).toBeVisible();
  });

  test('choosing recruiter persists appMode and loads recruiter UI', async ({ page }) => {
    await chooseRecruiterMode(page);
    const appMode = await page.evaluate(() => localStorage.getItem('appMode'));
    expect(appMode).toBe('recruiter');
    await expect(page.getByRole('button', { name: /Add Candidate/i })).toBeVisible();
  });

  test('legacy localStorage data auto-selects jobseeker without mode screen', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('jobTrackerAppV2Data', JSON.stringify([{ id: '1', name: 'Legacy Co', status: 'applied' }]));
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Add Company/i })).toBeVisible();
    const appMode = await page.evaluate(() => localStorage.getItem('appMode'));
    expect(appMode).toBe('jobseeker');
  });
});
