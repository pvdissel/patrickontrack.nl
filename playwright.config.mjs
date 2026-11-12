// Browser tests run against the fixed test site (tests/fixtures), built by ./scripts/test
// into .cache/test/fixture-public and served like GitHub Pages by tests/server.mjs.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node tests/server.mjs .cache/test/fixture-public ${PORT}`,
    url: `http://localhost:${PORT}/en/`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'e2e', testIgnore: /a11y/, use: { ...devices['Desktop Chrome'] } },
    { name: 'a11y', testMatch: /a11y/, use: { ...devices['Desktop Chrome'] } },
  ],
});
