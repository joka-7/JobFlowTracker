/** Clear app state before each test so mode selection appears. */
export async function clearAppStorage(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/** Pre-set job seeker mode and skip onboarding (for flow tests). */
export async function initJobSeekerApp(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('appMode', 'jobseeker');
    localStorage.setItem('hasCompletedOnboarding', '1');
  });
}

/** Pre-set recruiter mode (no onboarding shown). */
export async function initRecruiterApp(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('appMode', 'recruiter');
    localStorage.setItem('hasCompletedOnboarding_recruiter', '1');
  });
}

export async function chooseRecruiterMode(page) {
  await page.getByRole('heading', { name: /Recruiting/i }).click();
  await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();
}

export async function chooseJobSeekerMode(page) {
  await page.getByRole('heading', { name: /Job Search/i }).click();
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

/** Configure localStorage so isAIReady() is true (gemini + fake key). */
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

/** Pre-set tasks mode and skip Task Manager welcome modal. */
export async function initTasksApp(page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('appMode', 'tasks');
    localStorage.setItem('hasCompletedOnboarding_tasks', '1');
  });
}

export async function openTemplateLibrary(page) {
  await page.getByTestId('open-templates').first().click();
  await page.getByRole('heading', { name: /Template Library|Task Planning|Interview Guide/i }).waitFor();
}

export async function closeChatModal(page) {
  const modal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('button', { name: 'Close' }) });
  await modal.getByRole('button', { name: 'Close' }).click();
}
