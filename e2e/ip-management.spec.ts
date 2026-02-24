import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

function saveKey() {
  return 'studio-magnate-save-slot1';
}

test.describe('IP management', () => {
  test.describe.configure({ timeout: 240_000 });

  test('can acquire a franchise, create an owned franchise project draft, and create a public-domain adaptation draft', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.dismiss());

    // Start game
    await page.goto('/');
    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    // Save so we can patch player budget for deterministic acquisitions.
    await page.getByRole('button', { name: 'Save Game' }).click();

    await page.goto('/');

    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) throw new Error('No save found');

      const snapshot = JSON.parse(raw);
      if (!snapshot?.gameState?.studio) throw new Error('Invalid snapshot shape (gameState.studio)');

      snapshot.gameState.studio.budget = 200_000_000;
      snapshot.gameState.studio.debt = 0;

      window.localStorage.setItem(key, JSON.stringify(snapshot));
    }, saveKey());

    // Load patched save.
    await page.getByRole('button', { name: 'Load Saved Game' }).click();
    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();

    // Navigate to Franchise Manager (Studio dropdown)
    await page.getByRole('button', { name: 'Studio' }).click();
    await page.getByRole('menuitem', { name: 'Franchise Manager' }).click();

    // Acquire a franchise.
    await page.getByRole('tab', { name: 'Acquire & Public Domain' }).click();
    await expect(page.getByRole('heading', { name: 'Franchise & IP Management' })).toBeVisible();

    await page.getByRole('tab', { name: /^Available Franchises \(/ }).click();
    await page.getByRole('button', { name: 'Acquire Franchise' }).first().click();

    await expect(page.getByText('Franchise Acquired')).toBeVisible();

    // Owned franchise project creation (draft script) via OwnedFranchiseManager.
    await page.getByRole('tab', { name: 'Owned IP' }).click();
    await expect(page.getByRole('heading', { name: /Your Franchises/ })).toBeVisible();

    await page.getByRole('button', { name: 'Add Film' }).first().click();

    await expect(page.getByRole('heading', { name: 'Script Development' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Entry/ })).toBeVisible();

    // Public-domain script creation.
    await page.getByRole('button', { name: 'Studio' }).click();
    await page.getByRole('menuitem', { name: 'Franchise Manager' }).click();

    await page.getByRole('tab', { name: 'Acquire & Public Domain' }).click();
    await page.getByRole('tab', { name: /^Public Domain \(/ }).click();

    await page.getByRole('button', { name: 'Adapt Property' }).first().click();

    await expect(page.getByRole('heading', { name: 'Script Development' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Adaptation/ })).toBeVisible();
  });
});
