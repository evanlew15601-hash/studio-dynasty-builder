import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    launchOptions: {
      args: ['--proxy-bypass-list=<-loopback>'],
    },
  },
  webServer: {
    // Using localhost avoids proxy setups that bypass only "localhost" (but not "127.0.0.1"),
    // which can manifest as Chromium "too many redirects or authentication replays".
    command: 'npm run dev -- --host localhost --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
