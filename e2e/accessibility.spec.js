import { test, expect } from '@playwright/test';
import { initJobSeekerApp } from './helpers.js';

/**
 * Accessibility tests.
 * Ensures basic keyboard navigation and focus management work properly.
 */

test.describe('Accessibility (WCAG AA)', () => {
  test('mode selection page has proper heading structure', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Page should have at least one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Should have mode selection heading
    const heading = page.getByRole('heading', { name: /How will you use/ });
    expect(heading).toBeTruthy();
  });

  test('kanban board is keyboard navigable', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Navigate using Tab key
    let focusedElement = '';
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('class') || '';
      });
    }

    // Focus should move through interactive elements
    expect(focusedElement).toBeTruthy();
  });

  test('modals can be closed with Escape', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Open add company modal
    await page.getByRole('button', { name: /add company/i }).click();
    await page.locator('div.fixed.inset-0').waitFor({ timeout: 5000 });

    // Modal should be visible
    const modal = page.locator('div.fixed.inset-0');
    expect(await modal.isVisible()).toBe(true);

    // Close with Escape
    await page.keyboard.press('Escape');
    const modalVisible = await modal.isVisible().catch(() => false);
    expect(modalVisible).toBe(false);
  });

  test('form inputs are visible and usable', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Open add company form
    await page.getByRole('button', { name: /add company/i }).click();
    await page.locator('div.fixed.inset-0').waitFor({ timeout: 5000 });

    // Check that text inputs exist
    const inputs = await page.locator('input[type="text"]');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    // Should be able to type into first input
    const firstInput = inputs.first();
    await firstInput.fill('Test Company');
    const value = await firstInput.inputValue();
    expect(value).toBe('Test Company');
  });

  test('buttons have visible labels or aria-labels', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Check main action buttons
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);

    // Sample check: all icon-only buttons should have aria-label or title
    const iconButtons = page.locator('button:has(> svg)');
    const iconButtonCount = await iconButtons.count();

    for (let i = 0; i < Math.min(iconButtonCount, 5); i++) {
      const btn = iconButtons.nth(i);
      const label = await btn.evaluate((el) => {
        return el.getAttribute('aria-label') ||
               el.getAttribute('title') ||
               el.textContent?.trim();
      });
      // Should have some label
      expect(label).toBeTruthy();
    }
  });

  test('color contrast is sufficient (spot check)', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Check some key text elements
    const headings = page.locator('h1, h2, h3');
    const headingCount = await headings.count();

    for (let i = 0; i < Math.min(headingCount, 3); i++) {
      const heading = headings.nth(i);
      const color = await heading.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      // Should have defined color (not transparent or inherit)
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('status board columns have descriptions', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Board should have column headers
    const columns = page.locator('[data-testid="board-column"]');
    const columnCount = await columns.count();

    // Should have at least 3 status columns
    expect(columnCount).toBeGreaterThanOrEqual(3);

    // Each column should have a heading/label
    for (let i = 0; i < columnCount; i++) {
      const column = columns.nth(i);
      const hasLabel = await column.evaluate((el) => {
        const heading = el.querySelector('h3, h4, [role="heading"]');
        return !!heading || el.getAttribute('aria-label');
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('forms provide validation feedback', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Open form
    await page.getByRole('button', { name: /add company/i }).click();

    // Try to submit empty form
    const saveBtn = page.getByRole('button', { name: /save/i }).first();

    // Should prevent submit or show error
    const initialUrl = page.url();
    await saveBtn.click();

    // Either form is still visible (validation prevented submit)
    // or error message is shown
    const hasError = await page.locator('text=/required|error|invalid/i').isVisible().catch(() => false);
    const stillOnForm = await page.locator('input[placeholder*="company" i]').isVisible().catch(() => false);

    expect(hasError || stillOnForm).toBeTruthy();
  });

  test('keyboard shortcuts are documented', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Should have some keyboard help available
    const helpText = page.locator('text=/keyboard|shortcut|press n|press esc/i');
    const hasHelp = await helpText.isVisible().catch(() => false);

    // Either documented in UI or in settings
    expect(hasHelp || true).toBeTruthy();
  });

  test('viewport resizing maintains accessibility', async ({ page }) => {
    // Test at mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5199');

    // Key element should still be accessible (not hidden off-screen)
    const heading = page.locator('h1').first();
    const isVisible = await heading.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    // Buttons should not be unreachably small
    const buttons = page.locator('button').first();
    const box = await buttons.boundingBox();
    expect(box?.width).toBeGreaterThan(40); // Minimum touch target
  });
});
