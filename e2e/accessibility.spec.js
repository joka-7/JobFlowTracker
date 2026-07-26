import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { initJobSeekerApp, initRecruiterApp, initTasksApp } from './helpers.js';

/**
 * Real accessibility audits via axe-core, replacing the previous hand-rolled
 * checks (which mostly asserted elements were merely present, not that they
 * met any WCAG criterion — e.g. "color contrast" only checked visibility).
 * Fails on any violation of WCAG 2.0/2.1 A or AA rules; best-practice-only
 * rules are excluded since they're not standards violations and would make
 * this test noisy rather than actionable.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectNoViolations(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map(v => (
    `${v.id} (${v.impact}): ${v.description}\n  ${v.nodes.map(n => n.target.join(' ')).join('\n  ')}`
  )).join('\n\n');
  expect(results.violations, summary).toEqual([]);
}

test.describe('Accessibility (axe-core, WCAG 2.1 AA)', () => {
  test('mode selection screen has no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { name: /How will you use/i }).waitFor();
    await expectNoViolations(page);
  });

  test('job seeker board has no violations', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await expectNoViolations(page);
  });

  test('job seeker add-company form has no violations', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('button', { name: /add company/i }).click();
    await page.waitForTimeout(500);
    await expectNoViolations(page);
  });

  test('recruiter board has no violations', async ({ page }) => {
    await initRecruiterApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Recruiter Pipeline', exact: true }).waitFor();
    await expectNoViolations(page);
  });

  test('tasks board has no violations', async ({ page }) => {
    await initTasksApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Task Manager', exact: true }).waitFor();
    await expectNoViolations(page);
  });

  test('app is keyboard navigable past the header', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('/');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    const focusedTags = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      focusedTags.push(await page.evaluate(() => document.activeElement?.tagName));
    }

    // Tabbing should move focus onto real interactive elements, not get stuck on <body>.
    expect(focusedTags.some(tag => ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(tag))).toBe(true);
  });
});
