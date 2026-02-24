import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Quick Start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Custom Studio' })).toBeVisible();
});
