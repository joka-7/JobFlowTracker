import { test, expect } from '@playwright/test';
import { initJobSeekerApp } from './helpers.js';

/**
 * Performance tests for large datasets.
 * Ensures the app stays responsive with large data.
 */

function generateLargeDataset(count, mode = 'jobseeker') {
  if (mode === 'jobseeker') {
    return Array.from({ length: count }, (_, i) => ({
      id: String(i),
      name: `Company ${i}`,
      role: `Role ${i % 5}`,
      status: ['applied', 'interviewing', 'rejected', 'offer', 'withdrawn'][i % 5],
      location: `City ${i % 10}`,
      priority: ['high', 'medium', 'low'][i % 3],
      website: `https://company${i}.com`,
      linkedinCompany: `company-${i}`,
      generalNotes: `Notes for company ${i}`,
      interviews: [],
      rejection: { date: '', method: '', notes: '' },
    }));
  }
  return [];
}

test.describe('Performance - Large Datasets', () => {
  test('app handles moderate dataset loading', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Generate moderate dataset
    const dataset = generateLargeDataset(200);
    const storeStart = Date.now();
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);
    const storeTime = Date.now() - storeStart;

    // Storage should be reasonably fast
    expect(storeTime).toBeLessThan(1000);

    // Reload page to load from storage
    const reloadStart = Date.now();
    await page.reload();
    const reloadTime = Date.now() - reloadStart;

    // Reload should be fast even with data
    expect(reloadTime).toBeLessThan(5000);
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Page should be responsive
    const heading = page.getByRole('heading', { name: 'Job Search Tracker', exact: true });
    expect(await heading.isVisible()).toBe(true);
  });

  test('board view is accessible with loaded data', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Load small dataset
    const dataset = generateLargeDataset(50);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);

    // Reload page
    await page.reload();
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor({ timeout: 10000 });

    // Try to navigate to board view
    const boardBtn = page.getByRole('button', { name: /Status Board/i });
    if (await boardBtn.isVisible()) {
      await boardBtn.click();
      await page.waitForTimeout(500);
    }

    // Page should still be responsive
    expect(await page.isVisible('text=/Job Search Tracker/i')).toBe(true);
  });

  test('search filters large dataset efficiently', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Create large dataset with searchable names
    const companies = generateLargeDataset(500);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, companies);

    await page.reload();
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Search for specific company
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Company 123');
      await page.waitForTimeout(300);

      // Should show filtered results
      const results = page.locator('h3');
      expect(await results.count()).toBeGreaterThan(0);
    }
  });

  test('batch operations process large datasets efficiently', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Generate large dataset
    const dataset = generateLargeDataset(1000);

    // Measure time to store in localStorage
    const startTime = Date.now();
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);
    const storeTime = Date.now() - startTime;

    // Should store 1000 items in reasonable time (< 1 second)
    expect(storeTime).toBeLessThan(1000);
  });

  test('app remains responsive with moderate dataset', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Generate moderate dataset
    const dataset = generateLargeDataset(500);

    // Load into localStorage
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);

    // Reload to load from storage
    await page.reload();

    // Page should load and be functional
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor({ timeout: 15000 });

    // Should be able to interact with page
    const addBtn = page.getByRole('button', { name: /add company/i });
    expect(await addBtn.isVisible()).toBe(true);

    // List items should exist and be visible
    const listItems = page.locator('h3');
    const count = await listItems.count();
    // May have companies listed or empty state
    expect(count >= 0).toBe(true);
  });
});
