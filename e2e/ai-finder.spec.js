import { test, expect } from '@playwright/test';
import {
  initJobSeekerApp, initRecruiterApp, initTasksApp, initMockAI,
  mockGeminiChatStream, closeChatModal,
} from './helpers.js';

const MOCK_REPLY = 'Here are some job search strategies for you.';

test.describe('AI Finder buttons', () => {
  test.beforeEach(async ({ page }) => {
    await mockGeminiChatStream(page, MOCK_REPLY);
  });

  test('job seeker: Find Jobs button opens AI chat modal', async ({ page }) => {
    await initJobSeekerApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    await page.getByTitle(/Find Jobs/i).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Find Jobs/i).first()).toBeVisible();
  });

  test('job seeker: Find Jobs modal receives AI reply on autoStart', async ({ page }) => {
    await initJobSeekerApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    await page.getByTitle(/Find Jobs/i).click();
    await expect(page.getByText(MOCK_REPLY)).toBeVisible({ timeout: 5000 });

    await closeChatModal(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('recruiter: Find Candidates button opens AI chat modal', async ({ page }) => {
    await initRecruiterApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();

    await page.getByTitle(/Find Candidates/i).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Find Candidates/i).first()).toBeVisible();
  });

  test('recruiter: Find Candidates modal receives AI reply on autoStart', async ({ page }) => {
    await initRecruiterApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();

    await page.getByTitle(/Find Candidates/i).click();
    await expect(page.getByText(MOCK_REPLY)).toBeVisible({ timeout: 5000 });

    await closeChatModal(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('tasks: Goals & Tasks button opens AI chat modal', async ({ page }) => {
    await initTasksApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Task Manager', exact: true }).waitFor();

    await page.getByTitle(/Goals & Tasks/i).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Goals & Tasks/i).first()).toBeVisible();
  });

  test('tasks: Goals & Tasks modal receives AI reply on autoStart', async ({ page }) => {
    await initTasksApp(page);
    await initMockAI(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Task Manager', exact: true }).waitFor();

    await page.getByTitle(/Goals & Tasks/i).click();
    await expect(page.getByText(MOCK_REPLY)).toBeVisible({ timeout: 5000 });

    await closeChatModal(page);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('job seeker: Find Jobs button not shown in recruiter mode', async ({ page }) => {
    await initRecruiterApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();

    await expect(page.getByTitle(/Find Jobs/i)).toHaveCount(0);
  });

  test('recruiter: Find Candidates button not shown in job seeker mode', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    await expect(page.getByTitle(/Find Candidates/i)).toHaveCount(0);
  });
});
