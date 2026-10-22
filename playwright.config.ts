import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the production build (`vite preview`), so they see
 * exactly what a tester sees: the real bundle, the CSP meta tag, lazy chunks.
 *
 * Locally, PW_CHROMIUM_PATH can point at an installed Chromium. CI installs
 * Playwright's own browser.
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Deterministic UI: the app honours reduced motion, so stages switch at once.
    reducedMotion: 'reduce',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: ['**/responsive.e2e.ts', '**/phone-back.e2e.ts', '**/phone-taps.e2e.ts'] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: ['**/responsive.e2e.ts', '**/phone-back.e2e.ts', '**/phone-taps.e2e.ts'] },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
