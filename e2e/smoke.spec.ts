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

test('can quick start a new game', async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Quick Start$/ }).click();

  // Once the game shell mounts, the top header includes a "Save Game" button.
  // This guards against runtime errors during boot (e.g. blank screen after starting).
  await expect(page.getByRole('button', { name: /^Save Game$/ })).toBeVisible({ timeout: 55_000 });
});
