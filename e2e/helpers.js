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
  });
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

export async function saveForm(page) {
  await page.getByRole('button', { name: /Save Changes/i }).click();
}
