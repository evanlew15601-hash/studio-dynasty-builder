import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Studio Magnate/);
  await expect(page.getByRole('button', { name: 'Quick Start' })).toBeVisible();
});
