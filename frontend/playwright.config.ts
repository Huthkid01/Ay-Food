import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'site-mobile',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
      testMatch: /site\.spec\.ts/,
    },
    {
      name: 'admin-desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      testMatch: /admin\.spec\.ts/,
    },
  ],
});
