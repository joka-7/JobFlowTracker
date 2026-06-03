import { test, expect } from '@playwright/test';
import {
  initJobSeekerApp, initRecruiterApp, initTasksApp, mockGeminiChatStream,
  startMockInterview, chatModalPanel, closeChatModal, openTemplateLibrary,
  templateLibraryPanel, dismissBlockingOverlays,
} from './helpers.js';

const MOCK_REPLY = 'Welcome to your mock interview. Tell me about yourself.';

test.describe('Chat and mock interview (browser e2e)', () => {
  test.beforeEach(async ({ page }) => {
    await mockGeminiChatStream(page, MOCK_REPLY);
  });

  test('job seeker mock interview auto-starts and shows AI reply without crashing', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await startMockInterview(page);

    const chat = chatModalPanel(page, /Mock Interview/);
    await expect(chat).toBeVisible();
    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);

    await chat.getByRole('textbox').fill('My answer here');
    await chat.getByRole('textbox').press('Enter');
    await expect(chat.getByText('My answer here')).toBeVisible();
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);

    await closeChatModal(page);
    await expect(page.getByRole('heading', { name: 'Job Search Tracker', exact: true })).toBeVisible();
  });

  test('recruiter practice interview opens chat and receives reply', async ({ page }) => {
    await initRecruiterApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await startMockInterview(page, /Practice conducting/i);

    const chat = chatModalPanel(page, /Mock Interview/);
    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);

    await closeChatModal(page);
    await expect(page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true })).toBeVisible();
  });

  test('tasks mode coaching practice opens chat and receives reply', async ({ page }) => {
    await initTasksApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Task Manager', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await startMockInterview(page, /Practice with AI coach/i);

    const chat = chatModalPanel(page, /AI Coaching/);
    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);

    await closeChatModal(page);
    await expect(page.getByRole('heading', { name: 'Task Manager', exact: true })).toBeVisible();
  });

  test('job seeker AI assistant chat sends message without crashing', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await page.getByTitle(/AI Assistant/i).click();
    await page.getByRole('button', { name: /Open AI chat/i }).click();

    const chat = chatModalPanel(page, /AI Chat/);
    await expect(chat).toBeVisible();
    await chat.getByRole('textbox').fill('Hello coach');
    await chat.getByRole('textbox').press('Enter');

    await expect(chat.getByText('Hello coach')).toBeVisible();
    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);
  });

  test('mock interview enables after saving API key from settings (no preloaded initAI)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('appMode', 'jobseeker');
      localStorage.setItem('hasCompletedOnboarding', '1');
    });
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await startMockInterview(page);
    const chat = chatModalPanel(page, /Mock Interview/);
    await expect(chat.getByText(/Set API key to enable AI/i)).toBeVisible();

    await chat.getByRole('button', { name: /Set API key to enable AI/i }).click();
    await expect(page.getByText('AI Settings')).toBeVisible();
    await page.locator('input[type="password"]').fill('e2e-test-key-saved-in-ui');
    await page.getByRole('button', { name: /Save & Enable AI/i }).click();
    await expect(page.getByText('AI Settings')).toHaveCount(0, { timeout: 5_000 });

    await expect(chat.getByRole('textbox')).toBeVisible({ timeout: 5_000 });
    await expect(chat.getByText(/Set API key to enable AI/i)).toHaveCount(0);

    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(chat.getByText('Something went wrong')).toHaveCount(0);
  });

  test('switching mock interview category remounts chat cleanly', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await dismissBlockingOverlays(page);

    await startMockInterview(page);
    const chat = chatModalPanel(page, /Mock Interview/);
    await expect(chat.getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });

    await closeChatModal(page);
    await openTemplateLibrary(page);
    await templateLibraryPanel(page).getByRole('button', { name: /Technical/i }).click();
    await templateLibraryPanel(page).getByRole('button', { name: /Mock interview/i }).first().click();

    await expect(chatModalPanel(page, /Mock Interview/).getByText(MOCK_REPLY)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });
});
