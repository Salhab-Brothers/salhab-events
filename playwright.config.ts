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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // The local backend (npm run e2e:db) already serves the submit function.
  webServer: remote ? undefined : {
    command: `npx vite --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
