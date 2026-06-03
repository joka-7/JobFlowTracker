import { applyModeInit } from './modeInit.js';

/** Clear app state before each test so mode selection appears. */
export async function clearAppStorage(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Pre-set job seeker mode, skip onboarding, and enable mock AI (for flow + chat tests). */
export async function initJobSeekerApp(page) {
  await applyModeInit(page, 'jobseeker');
}

/** Pre-set recruiter mode and mock AI. */
export async function initRecruiterApp(page) {
  await applyModeInit(page, 'recruiter');
}

/** Pre-set tasks mode, skip welcome modal, and enable mock AI. */
export async function initTasksApp(page) {
  await applyModeInit(page, 'tasks');
}

export async function chooseRecruiterMode(page) {
  await page.getByRole('heading', { name: /Recruiter/i }).click();
  await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();
}

export async function chooseJobSeekerMode(page) {
  await page.getByRole('heading', { name: /Job Seeker/i }).click();
  await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor({ timeout: 15_000 });
}

export async function fillLabeledInput(page, labelPattern, value) {
  const label = page.locator('label').filter({ hasText: labelPattern }).first();
  await label.locator('xpath=following-sibling::input | following-sibling::textarea').first().fill(value);
}

export async function fillPlaceholderInput(page, placeholderPattern, value) {
  await page.getByPlaceholder(placeholderPattern).fill(value);
}

export async function selectLabeledOption(page, labelPattern, value) {
  const label = page.locator('label').filter({ hasText: labelPattern }).first();
  await label.locator('xpath=following-sibling::select').first().selectOption(value);
}

export async function saveForm(page) {
  await page.getByRole('button', { name: /Save Changes/i }).click();
}

export async function goToBoardTab(page) {
  await page.getByRole('button', { name: /Status Board/i }).click();
}

export async function goToListTab(page) {
  await page.getByRole('button', { name: /List & Edit/i }).click();
}

export async function selectListItem(page, name) {
  await page.locator('h3').filter({ hasText: name }).click();
}

export async function acceptNextDialog(page) {
  page.once('dialog', (dialog) => dialog.accept());
}

/** Drag a kanban card into a column identified by its status header text. */
export async function dragCardToColumn(page, cardName, columnHeaderPattern) {
  const card = page.locator('[draggable="true"]').filter({ hasText: cardName });
  const column = page.locator('.board-column').filter({ has: page.getByText(columnHeaderPattern) });
  await card.dragTo(column.locator('.bg-gray-100').first());
}

/** @deprecated AI keys are set in applyModeInit presets; kept for tests that clear storage mid-flow. */
export async function initMockAI(page) {
  await page.addInitScript(() => {
    localStorage.setItem('aiProvider', 'gemini');
    localStorage.setItem('aiApiKey', 'e2e-test-key');
    localStorage.setItem('aiModel', 'gemini-2.0-flash');
  });
}

/** Mock Gemini streaming API — avoids real network and API keys in e2e. */
export async function mockGeminiChatStream(page, replyText = 'Mock AI reply for e2e.') {
  const chunk = JSON.stringify({
    candidates: [{ content: { parts: [{ text: replyText }] } }],
  });
  const sseBody = `data: ${chunk}\n\n`;
  await page.route('**/generativelanguage.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
      body: sseBody,
    });
  });
}

/** Dismiss onboarding, welcome, or other full-screen overlays that block header clicks. */
export async function dismissBlockingOverlays(page) {
  for (let i = 0; i < 3; i++) {
    const skipTutorial = page.getByRole('button', { name: /Skip tutorial/i });
    if (await skipTutorial.isVisible().catch(() => false)) {
      await skipTutorial.click();
      await page.waitForTimeout(200);
      continue;
    }
    const skip = page.getByRole('button', { name: /^Skip$/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(200);
      continue;
    }
    const letsGo = page.getByRole('button', { name: /Let's go!/i });
    if (await letsGo.isVisible().catch(() => false)) {
      await letsGo.click();
      await page.waitForTimeout(200);
      continue;
    }
    const getStarted = page.getByRole('button', { name: /Get started/i });
    if (await getStarted.isVisible().catch(() => false)) {
      await getStarted.click();
      await page.waitForTimeout(200);
      continue;
    }
    break;
  }
}

export async function openTemplateLibrary(page) {
  await dismissBlockingOverlays(page);

  const byTitle = page.getByTitle(/Interview Template|Task Planning|Candidate Interview/i);
  if (await byTitle.first().isVisible().catch(() => false)) {
    await byTitle.first().click();
  } else {
    await page.locator('header .md\\:hidden.relative > button').first().click();
    await page.getByRole('button', { name: /Interview Template|Task Planning|Candidate Interview/i }).click();
  }

  await page.getByRole('heading', { name: /Template Library|Task Planning|Interview Guide/i }).waitFor();
}

export function templateLibraryPanel(page) {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: /Template Library|Task Planning|Interview Guide/i }),
  });
}

export async function startMockInterview(page, buttonPattern = /Mock interview/i) {
  await openTemplateLibrary(page);
  await templateLibraryPanel(page).getByRole('button', { name: buttonPattern }).first().click();
}

export function chatModalPanel(page, titlePattern = /Mock Interview|AI Coaching|AI Chat/) {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByText(titlePattern),
  });
}

export async function closeChatModal(page) {
  const modal = chatModalPanel(page);
  await modal.getByRole('button', { name: 'Close' }).click();
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
}
