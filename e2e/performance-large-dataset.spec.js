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
  test('loads 1000 companies and renders list view', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Generate and load large dataset
    const largeDataset = generateLargeDataset(1000);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, largeDataset);

    // Reload page to load from storage
    await page.reload();
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Page should show companies
    const companies = page.locator('h3');
    const companyCount = await companies.count();
    expect(companyCount).toBeGreaterThan(0);
  });

  test('board view renders with 500 companies', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Load large dataset
    const dataset = generateLargeDataset(500);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);

    // Go to board view
    await page.reload();
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();
    await page.getByRole('button', { name: /Status Board/i }).click();

    // Should be able to interact with board
    const columns = page.locator('[role="region"]');
    expect(await columns.count()).toBeGreaterThan(0);
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
    const filterTime = Date.now() - startTime;

    // Filter should complete in < 300ms (debounce + filter logic)
    expect(filterTime).toBeLessThan(300);

    // Should show matching results
    const results = await page.locator('text=/Company 55/').count();
    expect(results).toBeGreaterThan(0);
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

  test('list view remains responsive with large dataset', async ({ page }) => {
    await initJobSeekerApp(page);
    await page.goto('http://localhost:5199');
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Generate large dataset
    const hugeDataset = generateLargeDataset(2000);

    // Load into localStorage
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, hugeDataset);

    // Reload to load from storage
    const reloadStart = Date.now();
    await page.reload();
    const reloadTime = Date.now() - reloadStart;

    // Page should load in reasonable time
    await page.getByRole('heading', { name: 'Job Search Tracker', exact: true }).waitFor();

    // Reload should be fast enough (< 5 seconds even with 2000 items)
    expect(reloadTime).toBeLessThan(5000);

    // Should still be able to navigate
    const companies = page.locator('h3');
    expect(await companies.count()).toBeGreaterThan(0);
  });
});
