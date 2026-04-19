import { test, expect } from '@playwright/test';

test.describe('Trading Dashboard E2E', () => {
  test('should load the dashboard and render canvas', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    try {
      // Wait for the app to be mounted
      await expect(page.locator('.layout-container').first()).toBeVisible({
        timeout: 10000,
      });

      // Click on EUR/USD in the popular assets list to navigate to Trade view
      await page.locator('text=EUR/USD').first().click();

      // Wait for the Trade view to render
      const chartComponent = page.locator('.chart-component').first();
      await expect(chartComponent).toBeVisible({ timeout: 10000 });

      // Check for canvas presence (lightweight-charts appends a canvas)
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeAttached({ timeout: 10000 });

      // Click on canvas to ensure it's interactive
      await canvas.click({ position: { x: 50, y: 50 }, force: true });
    } catch (e) {
      console.log('Page text:', await page.textContent('body'));
      throw e;
    }
  });
});
