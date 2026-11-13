import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// Runs only in the restore drill, after scripts/restore-drill.mjs has restored a backup into the local
// stack. It never resets data: the point is that what came back works in the real site.
const expected = JSON.parse(readFileSync('.restore-expected.json', 'utf8')) as { bookings: number; booking_requests: number };

test('visitors can open the restored site and the calendar loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/تعذّر تحميل البيانات/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the re-created admin sees every restored booking', async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
  await page.locator('main').getByRole('button', { name: /^الحجوزات/ }).click();
  await expect(page.locator('main h3')).toHaveCount(expected.bookings);
});
