import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

test.describe('game start', () => {
  test.describe.configure({ timeout: 120_000 });

  test('quick start reaches game shell and scripts tab', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Advance Week' })).toBeVisible();
    await expect(page.getByText('Untitled Pictures')).toBeVisible();

    await page.getByRole('button', { name: 'Scripts' }).click();
    await expect(page.getByRole('heading', { name: 'Script Development' })).toBeVisible();
  });

  test('custom studio flow requires name before starting', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Custom Studio' }).click();

    const startGameButton = page.getByRole('button', { name: 'Start Game' });
    await expect(startGameButton).toBeDisabled();

    await page.getByLabel('Studio Name').fill('Playwright Studios');
    await expect(startGameButton).toBeEnabled();

    await startGameButton.click();
    await waitForOperationToComplete(page, 'Initializing Game');

    await expect(page.getByText('Playwright Studios')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();
  });
});
