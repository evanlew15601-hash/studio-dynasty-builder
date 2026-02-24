import { expect, test } from '@playwright/test';

import { waitForOperationToComplete } from './helpers';

function saveKey() {
  return 'studio-magnate-save-slot1';
}

test.describe('release flow + finance dashboard', () => {
  test.describe.configure({ timeout: 240_000 });

  test('can schedule a release for a (patched) ready-for-release film and open Finance tab', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.dismiss());

    // Start game
    await page.goto('/');
    await page.getByRole('button', { name: 'Quick Start' }).click();
    await waitForOperationToComplete(page, 'Initializing Game');

    // Create a script quickly (we'll patch it to be Final + pass coverage)
    await page.getByRole('button', { name: 'Scripts' }).click();
    await page.getByRole('button', { name: 'New Script' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'New Script' })).toBeVisible();

    await dialog.getByLabel('Project Title').fill('Release Test Film');
    await dialog.getByLabel('Writer').fill('E2E Writer');
    await dialog.getByLabel('Logline').fill('A film used to test release scheduling and finance views.');

    await dialog.getByRole('button', { name: 'Create Script' }).click();
    await expect(page.getByRole('heading', { name: 'Release Test Film' })).toBeVisible();

    // Save so we can patch the snapshot in localStorage.
    await page.getByRole('button', { name: 'Save Game' }).click();

    // Back to landing.
    await page.goto('/');

    // Patch script: set stage=final and complete 3/4 checklist items in both Polish and Final.
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) throw new Error('No save found');

      const snapshot = JSON.parse(raw);
      const scripts = snapshot?.gameState?.scripts;
      if (!Array.isArray(scripts)) throw new Error('Invalid snapshot shape (scripts)');

      const script = scripts.find((s: any) => s?.title === 'Release Test Film');
      if (!script) throw new Error('Could not find script to patch');

      script.developmentStage = 'final';

      const cov = script.coverage;
      if (!cov?.stages?.polish?.checklist || !cov?.stages?.final?.checklist) {
        throw new Error('Script coverage missing stages');
      }

      for (const stage of ['polish', 'final']) {
        const checklist = cov.stages[stage].checklist;
        checklist.forEach((item: any, idx: number) => {
          item.completed = idx < 3;
        });
      }

      window.localStorage.setItem(key, JSON.stringify(snapshot));
    }, saveKey());

    // Load patched save.
    await page.getByRole('button', { name: 'Load Saved Game' }).click();
    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();

    // Greenlight the patched script to create a real project object.
    await page.getByRole('button', { name: 'Scripts' }).click();
    const scriptCardHeading = page.getByRole('heading', { name: 'Release Test Film' });
    await expect(scriptCardHeading).toBeVisible();

    const scriptCard = scriptCardHeading.locator(
      'xpath=ancestor::div[contains(@class,"rounded-lg") and contains(@class,"border")][1]'
    );

    await expect(scriptCard.getByRole('button', { name: 'Greenlight' })).toBeVisible();
    await scriptCard.getByRole('button', { name: 'Greenlight' }).click();
    await waitForOperationToComplete(page, 'Creating Project');

    // Save again so we can patch the project to be release-ready.
    await page.getByRole('button', { name: 'Save Game' }).click();

    await page.goto('/');

    // Patch project: mark as ready-for-release + attach a director and lead actor.
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) throw new Error('No save found');

      const snapshot = JSON.parse(raw);
      const gs = snapshot?.gameState;
      if (!gs) throw new Error('Invalid snapshot shape (gameState)');

      const project = (gs.projects || []).find((p: any) => p?.title === 'Release Test Film');
      if (!project) throw new Error('Could not find project to patch');

      // Pick any director/actor IDs from talent pool.
      const directorId = (gs.talent || []).find((t: any) => t?.type === 'director')?.id || 'director';
      const actorId = (gs.talent || []).find((t: any) => t?.type === 'actor')?.id || 'actor';

      const chars = project?.script?.characters || [];
      if (Array.isArray(chars)) {
        let hasDirector = false;
        let hasLead = false;

        for (const c of chars) {
          if (c?.requiredType === 'director') {
            c.assignedTalentId = directorId;
            hasDirector = true;
          }
          if (c?.requiredType !== 'director' && c?.importance === 'lead') {
            c.assignedTalentId = actorId;
            hasLead = true;
          }
        }

        // If missing, inject minimal roles.
        if (!hasDirector) {
          chars.push({
            id: 'patched-director',
            name: 'Director',
            importance: 'crew',
            requiredType: 'director',
            assignedTalentId: directorId,
          });
        }

        if (!hasLead) {
          chars.push({
            id: 'patched-lead',
            name: 'Lead',
            importance: 'lead',
            requiredType: 'actor',
            assignedTalentId: actorId,
          });
        }

        project.script.characters = chars;
      }

      project.status = 'ready-for-release';
      project.currentPhase = 'marketing';
      project.phaseDuration = -1;
      project.readyForRelease = true;
      project.readyForMarketing = true;
      project.marketingData = project.marketingData || { currentBuzz: 80, totalSpent: 0, campaigns: [] };

      window.localStorage.setItem(key, JSON.stringify(snapshot));
    }, saveKey());

    // Load patched save with ready-for-release project.
    await page.getByRole('button', { name: 'Load Saved Game' }).click();
    await expect(page.getByRole('button', { name: 'Save Game' })).toBeVisible();

    // Select project from Dashboard and schedule a release.
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await expect(page.getByRole('heading', { name: 'Active Productions' })).toBeVisible();
    await page.getByText('Release Test Film').click();

    await page.getByRole('button', { name: 'Marketing' }).click();
    const planRelease = page.getByRole('button', { name: 'Plan Release' });
    await expect(planRelease).toBeEnabled();
    await planRelease.click();

    const releaseDialog = page.getByRole('dialog');
    await expect(releaseDialog.getByRole('heading', { name: /Release Strategy/i })).toBeVisible();

    // Pick a recommended window and schedule.
    await releaseDialog.getByRole('heading', { name: /Summer Blockbuster/i }).click();

    const scheduleButton = releaseDialog.getByRole('button', { name: /Schedule Release/i });
    await expect(scheduleButton).toBeEnabled();
    await scheduleButton.click();

    // Scheduling changes status away from ready-for-release, so the "Plan Release" entry point should disable.
    await expect(planRelease).toBeDisabled();

    // Finance tab should render.
    await page.getByRole('button', { name: 'Finance' }).click();
    await expect(page.getByText('Cash on Hand')).toBeVisible();
  });
});
