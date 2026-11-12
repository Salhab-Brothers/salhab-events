import { test, expect } from '@playwright/test';
import { nav } from './nav';

test('a page address opens that page, and survives a reload', async ({ page }) => {
  await page.goto('/#/reviews');
  await expect(page.getByRole('heading', { name: 'التقييمات والمراجعات' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'التقييمات والمراجعات' })).toBeVisible();
});

test('the address follows navigation, and back and forward work', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'طلب حجز');
  await expect(page).toHaveURL(/#\/request$/);
  await expect(page.getByRole('heading', { name: 'طلب حجز', level: 1 })).toBeVisible();

  await nav(page, 'التقييمات');
  await expect(page).toHaveURL(/#\/reviews$/);

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'طلب حجز', level: 1 })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'التقييمات والمراجعات' })).toBeVisible();
});

test('an unknown address falls back to the calendar', async ({ page }) => {
  await page.goto('/#/nowhere');
  await expect(page.getByRole('heading', { name: /تقويم/, level: 1 })).toBeVisible();
});
