import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

// E2E_BASE_URL points the read-only smoke checks at a deployed site (no local servers started).
const remote = process.env.E2E_BASE_URL;
const PORT = 5174;
// A production build served by `vite preview`, only for the offline spec: the dev server loads its
// scripts from paths a service worker cannot (and should not) keep.
const PWA_PORT = 5175;

export default defineConfig({
  testDir: 'e2e',
  // Tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: remote ?? `http://localhost:${PORT}`, trace: 'retain-on-failure', locale: 'ar' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /(pwa|visual)\.spec\.ts/ },
    { name: 'pwa', use: { ...devices['Desktop Chrome'], baseURL: remote ?? `http://localhost:${PWA_PORT}` }, testMatch: /pwa\.spec\.ts/ },
    // Screenshots of every page at phone, tablet and desktop size, compared with committed baselines (e2e/visual.spec.ts-snapshots).
    // The baselines are made on Linux in CI (see .github/workflows/visual-baselines.yml), so locally this project is only for a quick look.
    { name: 'visual', use: { ...devices['Desktop Chrome'] }, testMatch: /visual\.spec\.ts/ },
    // A phone-sized browser for the checks that matter on small screens (most visitors are on phones).
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /(accessibility|smoke)\.spec\.ts/ },
    // Safari's engine. The behaviour specs run here; accessibility is engine independent, so it stays on chromium.
    // (It needs system libraries that only CI installs, see the install line in .github/workflows/ci.yml.)
    { name: 'safari', use: { ...devices['Desktop Safari'] }, testMatch: /(public|admin|routing|smoke)\.spec\.ts/ },
    { name: 'iphone', use: { ...devices['iPhone 15'] }, testMatch: /(smoke|routing)\.spec\.ts/ },
  ],
  // The local backend (npm run e2e:db) already serves the submit function.
  webServer: remote ? undefined : [
    {
      command: `npx vite --mode e2e --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx vite build --mode e2e --outDir dist-pwa && npx vite preview --mode e2e --outDir dist-pwa --port ${PWA_PORT} --strictPort`,
      url: `http://localhost:${PWA_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
