import { expect, test } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Studio Magnate');
  await expect(page.getByRole('button', { name: /^Quick Start$/ })).toBeVisible();
});

test('can navigate to Help and back', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.getByRole('link', { name: /Help & Open Source/i }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole('heading', { name: /^Help$/ })).toBeVisible();

  await page.getByRole('link', { name: /^Back$/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /^Quick Start$/ })).toBeVisible();
});
