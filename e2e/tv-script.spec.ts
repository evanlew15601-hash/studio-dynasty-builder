import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

test.describe('television: script -> greenlight -> production gating', () => {
  test.describe.configure({ timeout: 180_000 });

  test('can create TV script, must be final to greenlight, and production is gated by casting', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    // Navigate to Television & Streaming
    await page.getByRole('button', { name: 'Studio' }).click();
    await page.getByRole('menuitem', { name: 'Television & Streaming' }).click();
    await expect(page.getByRole('heading', { name: 'Television & Streaming' })).toBeVisible();

    // Create a new TV script
    await page.getByRole('button', { name: 'New TV Script' }).click();
    await expect(page.getByRole('heading', { name: 'TV Script Development Workshop' })).toBeVisible();

    await page.getByLabel('Show Title').fill('E2E Series');
    await page.getByLabel('Show Concept').fill('A test series for end-to-end validation.');

    await page.getByRole('button', { name: 'Create TV Script' }).click();

    // In the library it should be Not Ready (stage != final)
    const tvLibraryHeading = page.getByRole('heading', { name: 'TV Script Library' });
    await tvLibraryHeading.scrollIntoViewIfNeeded();

    const tvCardHeading = page.getByRole('heading', { name: 'E2E Series' });
    await expect(tvCardHeading).toBeVisible();

    const tvCard = tvCardHeading.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );

    await expect(tvCard.getByRole('button', { name: 'Not Ready' })).toBeVisible();

    // Attempting to greenlight early should show an error toast.
    await tvCard.getByRole('button', { name: 'Not Ready' }).click();
    await expect(page.getByText('Script Not Ready')).toBeVisible();

    // Edit and set stage to final
    await tvCard.getByRole('button', { name: /Edit/i }).click();
    await expect(page.getByRole('heading', { name: 'TV Script Development Workshop' })).toBeVisible();

    await page.getByRole('combobox', { name: 'Development Stage' }).click();
    await page.getByRole('listbox').getByRole('option', { name: /final/i }).click();

    await page.getByRole('button', { name: 'Update TV Script' }).click();

    // Greenlight
    const tvCardFinalHeading = page.getByRole('heading', { name: 'E2E Series' });
    const tvCardFinal = tvCardFinalHeading.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );

    await expect(tvCardFinal.getByRole('button', { name: 'Greenlight' })).toBeVisible();
    await tvCardFinal.getByRole('button', { name: 'Greenlight' }).click();
    await waitForOperationToComplete(page, 'Creating Project');

    // Verify project appears in TV Production Management and is gated by casting
    await page.getByRole('tab', { name: 'Production' }).click();
    await expect(page.getByRole('heading', { name: /TV Shows in Development/ })).toBeVisible();
    await expect(page.getByText('E2E Series')).toBeVisible({ timeout: 120_000 });

    const tvProjectHeading = page.getByRole('heading', { name: 'E2E Series' });
    const tvProjectCard = tvProjectHeading.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );

    await expect(tvProjectCard.getByRole('button', { name: 'Move to Pre-Production' })).toBeDisabled();
  });
});
