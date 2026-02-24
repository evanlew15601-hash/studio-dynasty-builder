import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

test.describe('save/load', () => {
  test.describe.configure({ timeout: 120_000 });

  test('can save a game and load it from the landing screen', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.dismiss());

    await page.goto('/');

    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    await expect(page.getByRole('button', { name: 'Advance Week' })).toBeVisible();
    await page.getByRole('button', { name: 'Advance Week' }).click();
    await waitForOperationToComplete(page, 'Processing Weekly Updates');

    // Confirm time advanced in the header (toast uses a different format, without the quarter).
    await expect(page.getByText(/Week 2, Q\d+ \d{4}/)).toBeVisible();

    await page.getByRole('button', { name: 'Save Game' }).click();

    await page.goto('/');
    await page.getByRole('button', { name: 'Load Saved Game' }).click();

    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();
    await expect(page.getByText('Untitled Pictures')).toBeVisible();
    await expect(page.getByText(/Week 2, Q\d+ \d{4}/)).toBeVisible();
  });
});
