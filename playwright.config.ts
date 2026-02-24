import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const webServerURL = `http://127.0.0.1:${port}`;

// If you set PLAYWRIGHT_BASE_URL, Playwright will *not* start a local dev/preview server.
// This is useful for pointing at an already-running environment.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? webServerURL;
const useWebServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html']],
  use: {
    baseURL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: useWebServer
    ? {
        command: process.env.CI
          ? `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`
          : `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: webServerURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      }
    : undefined,
});
