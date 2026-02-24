import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

test.describe('script development (film)', () => {
  test.describe.configure({ timeout: 180_000 });

  test('create draft, persist stage, then satisfy coverage gates, finalize, and greenlight', async ({ page }) => {
    await page.goto('/');

    // Start game
    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    // Navigate to Script Development
    await page.getByRole('button', { name: 'Scripts' }).click();
    await expect(page.getByRole('heading', { name: 'Script Development' })).toBeVisible();

    // Create a new script
    await page.getByRole('button', { name: 'New Script' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'New Script' })).toBeVisible();

    await dialog.getByLabel('Project Title').fill('E2E Movie');
    await dialog.getByLabel('Writer').fill('E2E Writer');
    await dialog.getByLabel('Logline').fill('A test script that goes from draft to greenlight.');

    // Pick an intermediate stage (to verify persistence).
    await dialog.getByRole('button', { name: 'Polish' }).click();
    await expect(dialog.getByRole('button', { name: 'Polish' })).toHaveAttribute('data-state', 'on');

    await dialog.getByRole('button', { name: 'Create Script' }).click();

    // Script appears in library and remains at the chosen stage.
    const scriptCardTitle = page.getByRole('heading', { name: 'E2E Movie' });
    await expect(scriptCardTitle).toBeVisible();

    const scriptCard = scriptCardTitle.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );
    await expect(scriptCard.getByText('polish')).toBeVisible();

    // Edit the script and ensure stage selection persisted.
    await scriptCard.getByRole('button', { name: /Edit/i }).click();
    await expect(dialog.getByRole('heading', { name: 'Edit Script' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Polish' })).toHaveAttribute('data-state', 'on');

    // Attempting to select Final should be blocked until coverage gates are satisfied.
    await dialog.getByRole('button', { name: 'Final' }).click();
    await expect(dialog.getByRole('button', { name: 'Final' })).not.toHaveAttribute('data-state', 'on');
    await expect(dialog.getByRole('button', { name: 'Polish' })).toHaveAttribute('data-state', 'on');

    // Apply a revision action (shows toast + adds to recent list)
    const revisionTypeSelect = dialog.getByRole('combobox').filter({ hasText: /Coverage received/i });
    await revisionTypeSelect.click();
    await page.getByRole('option', { name: 'Major revision' }).click();
    await dialog.getByPlaceholder(/Optional note/i).fill('Tighten Act 2');
    await dialog.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Spent 150k.')).toBeVisible();

    // Satisfy the coverage gate: 75%+ in both Polish and Final (3/4 checklist items each).
    await dialog.getByRole('tab', { name: 'Polish' }).click();
    await dialog.getByLabel('Pacing tightened').click();
    await dialog.getByLabel('Continuity checked').click();
    await dialog.getByLabel('Budget realism pass').click();

    await dialog.getByRole('tab', { name: 'Final' }).click();
    await dialog.getByLabel('Proofread + formatting pass').click();
    await dialog.getByLabel('Notes addressed').click();
    await dialog.getByLabel('Production-ready lock').click();

    // Now Final is selectable.
    await dialog.getByRole('button', { name: 'Final' }).click();
    await expect(dialog.getByRole('button', { name: 'Final' })).toHaveAttribute('data-state', 'on');

    // Saving while in Final is treated as explicit finalization.
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Script Finalized')).toBeVisible();

    // Card should now show Greenlight.
    await expect(scriptCard.getByRole('button', { name: 'Greenlight' })).toBeVisible();

    // Greenlight creates a project and removes script from the available scripts list.
    await scriptCard.getByRole('button', { name: 'Greenlight' }).click();
    await waitForOperationToComplete(page, 'Creating Project');

    await expect(scriptCardTitle).toBeHidden();

    // Verify project exists on the Dashboard.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Active Productions' })).toBeVisible();
    await expect(page.getByText('E2E Movie')).toBeVisible();
  });
});
