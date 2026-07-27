import { test, expect } from '@playwright/test';
import {
  initJobSeekerApp, initGroqConfig, mockGroqChatStream,
  fillLabeledInput, saveForm, goToListTab, selectListItem,
} from './helpers.js';

async function addAndOpenCompany(page, name) {
  await page.getByRole('button', { name: /Add Company/i }).click();
  await fillLabeledInput(page, /Company Name/i, name);
  await fillLabeledInput(page, /^Role$/i, 'Engineer');
  await saveForm(page);
  await goToListTab(page);
  await selectListItem(page, name);
}

async function openAIAssistantAndPrep(page) {
  await page.getByTitle(/AI Assistant/i).click();
  // Real precondition check, not a fabricated skip: the amber "no API key"
  // banner only renders when isAIReady() is false.
  await expect(page.getByText(/Set API key to enable AI/i)).toHaveCount(0);
  return page.getByRole('button', { name: /Prep for interview/i });
}

test.describe('AI Rate Limiting', () => {
  test.beforeEach(async ({ page }) => {
    await initJobSeekerApp(page);
    await initGroqConfig(page);
    await mockGroqChatStream(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
  });

  test('throttles a second rapid AI call within the 3s window', async ({ page }) => {
    await addAndOpenCompany(page, 'TestCo');
    const prepButton = await openAIAssistantAndPrep(page);

    await prepButton.click();
    await page.waitForTimeout(500);

    // Second call inside the 3s window must be rejected before it reaches the network.
    await prepButton.click();
    await expect(page.getByText(/Rate limited\. Please wait/i)).toBeVisible();
  });

  test('allows an AI call again after the rate-limit window passes', async ({ page }) => {
    await addAndOpenCompany(page, 'TestCo2');
    const prepButton = await openAIAssistantAndPrep(page);

    await prepButton.click();
    await page.waitForTimeout(500);
    await page.waitForTimeout(3100);

    await prepButton.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Rate limited\. Please wait/i)).toHaveCount(0);
  });

  test('rapid button mashing only lets the first click through', async ({ page }) => {
    await addAndOpenCompany(page, 'TestCo3');
    const prepButton = await openAIAssistantAndPrep(page);

    for (let i = 0; i < 10; i++) {
      await prepButton.click({ force: true });
      await page.waitForTimeout(50);
    }

    await expect(page.getByText(/Rate limited\. Please wait/i)).toBeVisible();
  });
});
