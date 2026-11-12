import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'jsdom',
    // vmThreads builds the jsdom environment once per worker instead of once per file:
    // about 2x faster here (14s to 6s on 2 cores). If a test ever leaks state, switch to 'forks'.
    pool: 'vmThreads',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // index.ts of each function only wires in Deno, so the tested logic lives in the other files.
      include: ['src/**/*.{ts,tsx}', 'supabase/functions/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/types.ts', 'supabase/functions/**/index.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
