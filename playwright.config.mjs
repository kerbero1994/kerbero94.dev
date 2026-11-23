// E2E in three engines, visual regression in one. Chromium runs as the installed
// Google Chrome (channel), the browser recruiters actually use; WebKit runs as an
// iPhone, the engine of LinkedIn's in-app browser on iOS.
import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0, // a pass on retry is reported as flaky, not hidden
  workers: CI ? 2 : 1,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:8791', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: { command: 'npm run serve', url: 'http://127.0.0.1:8791/', reuseExistingServer: !CI },
  // Visual baselines are Linux renders made in CI (see README); no platform suffix on purpose.
  // ARIA snapshots (text) live next to them, under tests/e2e/__snapshots__.
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide' } },
  projects: [
    { name: 'chrome', testDir: 'tests/e2e', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'firefox', testDir: 'tests/e2e', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit-iphone', testDir: 'tests/e2e', use: { ...devices['iPhone 15'] } },
    { name: 'visual', testDir: 'tests/visual', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
  ],
});
