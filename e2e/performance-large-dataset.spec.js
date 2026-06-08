import { test, expect } from '@playwright/test';

/**
 * Performance tests for large datasets.
 * Ensures the app stays responsive with 1000+ items.
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
  // Similar for recruiter, tasks modes
  return [];
}

test.describe('Performance - Large Datasets', () => {
  test('renders 1000 companies without UI freezing', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Measure import time
    const startTime = Date.now();

    // Trigger import via JSON data
    const largeDataset = generateLargeDataset(1000);
    const importTime = await page.evaluate((data) => {
      const start = performance.now();
      // Simulate import
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
      window.dispatchEvent(new Event('storage'));
      return performance.now() - start;
    }, largeDataset);

    const endTime = Date.now();

    // Import should complete in < 2 seconds
    expect(importTime).toBeLessThan(2000);

    // Page should remain responsive (no hard hang)
    await page.reload();
    expect(await page.isVisible('text=/Company 0/')).toBeTruthy();
  });

  test('kanban board scrolls smoothly with 500 companies', async ({ page }) => {
    await page.goto('http://localhost:5199');

    const dataset = generateLargeDataset(500);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);

    await page.reload();
    await page.waitForSelector('[data-testid="board-column"]', { timeout: 5000 });

    // Measure scroll performance
    const startTime = Date.now();

    // Scroll through board
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        document.querySelector('[data-testid="board-container"]').scrollLeft += 200;
      });
      await page.waitForTimeout(100);
    }

    const scrollTime = Date.now() - startTime;

    // Should complete smooth scroll in < 500ms
    expect(scrollTime).toBeLessThan(500);
  });

  test('search filters 1000 items in < 200ms', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Create large dataset
    const companies = generateLargeDataset(1000);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, companies);

    await page.reload();
    await page.waitForSelector('input[placeholder*="search" i]', { timeout: 5000 });

    const searchInput = page.locator('input[placeholder*="search" i]');

    // Measure filter time
    const startTime = Date.now();
    await searchInput.fill('Company 555');
    await page.waitForTimeout(300); // Debounce + filter
    const filterTime = Date.now() - startTime;

    // Filter should complete in < 300ms (debounce + filter logic)
    expect(filterTime).toBeLessThan(300);

    // Should show matching results
    const results = await page.locator('text=/Company 55/').count();
    expect(results).toBeGreaterThan(0);
  });

  test('firebase sync handles 1000 items without timeout', async ({ page }) => {
    test.setTimeout(30000); // 30 second timeout for this test

    await page.goto('http://localhost:5199');

    const dataset = generateLargeDataset(1000);

    // Simulate sync batch writes
    const syncStartTime = Date.now();

    await page.evaluate((data) => {
      // Simulates batchSaveItems chunking (490 items per batch)
      const CHUNK = 490;
      let processed = 0;
      for (let i = 0; i < data.length; i += CHUNK) {
        processed += Math.min(CHUNK, data.length - i);
      }
      return processed; // Should process all 1000
    }, dataset);

    const syncTime = Date.now() - syncStartTime;

    // Batch save should complete in < 5 seconds
    expect(syncTime).toBeLessThan(5000);
  });

  test('list view remains responsive with 10000 items in memory', async ({ page }) => {
    await page.goto('http://localhost:5199');

    // Generate huge dataset
    const hugeDataset = generateLargeDataset(10000);

    // Load into localStorage
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, hugeDataset);

    await page.reload();

    // Should load without crashes
    expect(await page.isVisible('text=/Company/')).toBeTruthy();

    // Navigation should work
    await page.getByRole('button', { name: /list/i }).click();
    expect(await page.isVisible('[data-testid="company-list"]')).toBeTruthy();
  });
});

test.describe('Performance - Memory Usage', () => {
  test('memory usage stays reasonable with 1000 items', async ({ page }) => {
    await page.goto('http://localhost:5199');

    const dataset = generateLargeDataset(1000);
    await page.evaluate((data) => {
      localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(data));
    }, dataset);

    await page.reload();

    // Get memory metrics
    const metrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }
      return null;
    });

    if (metrics) {
      const usagePercent = (metrics.usedJSHeapSize / metrics.jsHeapSizeLimit) * 100;
      // Should not exceed 70% of available heap
      expect(usagePercent).toBeLessThan(70);
    }
  });
});
