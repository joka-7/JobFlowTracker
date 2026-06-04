import { test, expect } from '@playwright/test';
import {
  initRecruiterApp, fillLabeledInput, fillPlaceholderInput, selectLabeledOption,
  saveForm, goToBoardTab, goToListTab, selectListItem, acceptNextDialog, dragCardToColumn,
} from './helpers.js';

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

  test('AI assistant panel (interview prep) is not visible in recruiter mode', async ({ page }) => {
    await expect(page.locator('text=Interview prep')).toHaveCount(0);
  });

  test('Find Candidates AI button is visible in recruiter mode', async ({ page }) => {
    await expect(page.getByTitle(/Find Candidates/i)).toBeVisible();
  });

  test('recruiter-only fields are saved and shown in detail view', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Carol Lee');
    await fillLabeledInput(page, /Position Applied/i, 'Product Manager');
    await fillPlaceholderInput(page, /Candidate LinkedIn/i, 'https://linkedin.com/in/carol');
    await fillPlaceholderInput(page, /Current Role/i, 'PM at StartupCo');
    await fillPlaceholderInput(page, /Expected Salary/i, '$150k');
    await fillPlaceholderInput(page, /Source \(referral/i, 'LinkedIn referral');
    await saveForm(page);

    await expect(page.getByText('PM at StartupCo')).toBeVisible();
    await expect(page.getByText('$150k')).toBeVisible();
    await expect(page.getByText('LinkedIn referral')).toBeVisible();
    await expect(page.getByRole('link', { name: /Candidate LinkedIn/i })).toBeVisible();
  });

  test('drag candidate to new status column on board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Alice Drag');
    await saveForm(page);

    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Bob Anchor');
    await selectLabeledOption(page, /Hiring Stage/i, 'screening');
    await saveForm(page);

    await goToBoardTab(page);
    await dragCardToColumn(page, 'Alice Drag', /^Initial Screening \(\d+\)$/);

    const screeningCol = page.locator('.board-column').filter({ has: page.getByText(/^Initial Screening \(\d+\)$/) });
    await expect(screeningCol.getByText('Alice Drag')).toBeVisible();
    await expect(page.locator('.board-column').filter({ has: page.getByText(/^Application Received \(\d+\)$/) }).getByText('Alice Drag')).toHaveCount(0);
  });

  test('edit candidate updates name on board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Old Name');
    await saveForm(page);

    await goToListTab(page);
    await page.getByRole('button', { name: /Edit Details/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'Updated Name');
    await saveForm(page);

    await goToBoardTab(page);
    await expect(page.getByText('Updated Name')).toBeVisible();
    await expect(page.getByText('Old Name')).toHaveCount(0);
  });

  test('delete candidate removes from list and board', async ({ page }) => {
    await page.getByRole('button', { name: /Add Candidate/i }).click();
    await fillLabeledInput(page, /Candidate Name/i, 'To Delete');
    await saveForm(page);

    await goToListTab(page);
    acceptNextDialog(page);
    await page.getByTitle(/Delete Candidate/i).click();
    await expect(page.getByText('Candidate deleted.')).toBeVisible();

    await goToListTab(page);
    await expect(page.getByText('To Delete')).toHaveCount(0);
    await goToBoardTab(page);
    await expect(page.getByText('To Delete')).toHaveCount(0);
  });
});
