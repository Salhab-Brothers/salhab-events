import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

// E2E_BASE_URL points the read-only smoke checks at a deployed site (no local servers started).
const remote = process.env.E2E_BASE_URL;
const PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  // Tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: remote ?? `http://localhost:${PORT}`, trace: 'retain-on-failure', locale: 'ar' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // A phone-sized browser for the checks that matter on small screens (most visitors are on phones).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /(accessibility|smoke)\.spec\.ts/ },
    // Safari's engine. The behaviour specs run here; accessibility is engine independent, so it stays on chromium.
    // (It needs system libraries that only CI installs, see the install line in .github/workflows/ci.yml.)
    { name: 'safari', use: { ...devices['Desktop Safari'] }, testMatch: /(public|admin|routing|smoke)\.spec\.ts/ },
    { name: 'iphone', use: { ...devices['iPhone 15'] }, testMatch: /(smoke|routing)\.spec\.ts/ },
  ],
  // The local backend (npm run e2e:db) already serves the submit function.
  webServer: remote ? undefined : {
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
