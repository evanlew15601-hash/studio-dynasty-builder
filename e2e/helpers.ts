import { expect, type Page } from '@playwright/test';

export async function waitForOperationToComplete(page: Page, operationName: string) {
  const operationHeading = page.getByRole('heading', { name: operationName });

  // Require the overlay to show up; if it never appears, something is wrong and the test should fail.
  await expect(operationHeading).toBeVisible({ timeout: 15_000 });
  await expect(operationHeading).toBeHidden({ timeout: 120_000 });
}
